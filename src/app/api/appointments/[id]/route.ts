import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  waLink,
  msgConfirmed,
  msgRescheduled,
  msgCancelled,
  msgCompleted,
  msgCustomerCancelled,
  msgCustomerReactivated,
} from '@/lib/whatsapp'
import { pushToOwner, pushToCustomer } from '@/lib/push'

// Actualizar estado de una cita (confirmar/cancelar/completar) o marcar depósito
// El dueño/admin usa la sesión; el cliente anónimo puede cancelar con su customerHash.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  const isStaff = session.role === 'owner' || session.role === 'admin'
  if (!isStaff && session.role !== null) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { status, depositPaid, depositAmount, customerHash, date } = body

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: { business: { include: { owner: true } } },
  })
  if (!appointment) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }

  // ===== Flujo cliente anónimo: cancelar o reactivar con su hash =====
  if (!isStaff) {
    if (
      !customerHash ||
      typeof customerHash !== 'string' ||
      !appointment.customerHash ||
      customerHash !== appointment.customerHash
    ) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Cancelar
    if (status === 'cancelada') {
      if (!['pendiente', 'confirmada'].includes(appointment.status)) {
        return NextResponse.json(
          { error: `No se puede cancelar una cita ${appointment.status}` },
          { status: 400 }
        )
      }
      const cancelled = await db.appointment.update({
        where: { id },
        data: { status: 'cancelada' },
        include: { service: true, business: { include: { owner: true } } },
      })
      // Avisar al dueño: push + link wa.me devuelto
      const ownerPhone = cancelled.business.owner?.phone || cancelled.business.phone
      const msg = msgCustomerCancelled({
        businessName: cancelled.business.name,
        customerName: cancelled.customerName,
        customerPhone: cancelled.customerPhone,
        serviceName: cancelled.service?.name || '',
        date: cancelled.date,
      })
      const ownerId = cancelled.business.ownerId
      if (ownerId) {
        pushToOwner(ownerId, {
          title: `Cita cancelada — ${cancelled.business.name}`,
          body: `${cancelled.customerName} canceló su cita`,
          url: `#/negocio/${cancelled.business.slug}/panel`,
        }).catch(() => {})
      }
      return NextResponse.json({
        ...cancelled,
        ownerWhatsappLink: waLink(ownerPhone, msg),
      })
    }

    // Reactivar una cita cancelada (vuelve a pendiente)
    if (status === 'pendiente') {
      if (appointment.status !== 'cancelada') {
        return NextResponse.json(
          { error: 'Solo se pueden reactivar citas canceladas' },
          { status: 400 }
        )
      }
      // Verificar que el horario siga libre (sin otras citas activas)
      const svc = await db.service.findUnique({ where: { id: appointment.serviceId } })
      const end = new Date(appointment.date.getTime() + (svc?.durationMin || 30) * 60 * 1000)
      const sameDay = await db.appointment.findMany({
        where: {
          businessId: appointment.businessId,
          id: { not: id },
          status: { in: ['pendiente', 'confirmada'] },
          date: {
            gte: new Date(
              appointment.date.getFullYear(),
              appointment.date.getMonth(),
              appointment.date.getDate()
            ),
            lt: new Date(
              appointment.date.getFullYear(),
              appointment.date.getMonth(),
              appointment.date.getDate() + 1
            ),
          },
        },
        include: { service: true },
      })
      const conflict = sameDay.some((c) => {
        const cEnd = new Date(c.date.getTime() + (c.service?.durationMin || 60) * 60 * 1000)
        return appointment.date < cEnd && end > c.date
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'No se puede reactivar: ese horario ya está ocupado. Elige otra hora.' },
          { status: 409 }
        )
      }
      const reactivated = await db.appointment.update({
        where: { id },
        data: { status: 'pendiente' },
        include: { service: true, business: { include: { owner: true } } },
      })
      const ownerPhone = reactivated.business.owner?.phone || reactivated.business.phone
      const msg = msgCustomerReactivated({
        businessName: reactivated.business.name,
        customerName: reactivated.customerName,
        customerPhone: reactivated.customerPhone,
        serviceName: reactivated.service?.name || '',
        date: reactivated.date,
      })
      if (reactivated.business.ownerId) {
        pushToOwner(reactivated.business.ownerId, {
          title: `Cita reactivada — ${reactivated.business.name}`,
          body: `${reactivated.customerName} reactivó su cita`,
          url: `#/negocio/${reactivated.business.slug}/panel`,
        }).catch(() => {})
      }
      return NextResponse.json({
        ...reactivated,
        ownerWhatsappLink: waLink(ownerPhone, msg),
      })
    }

    return NextResponse.json(
      { error: 'Los clientes solo pueden cancelar o reactivar sus citas' },
      { status: 400 }
    )
  }

  // ===== Flujo dueño/admin =====
  // Si es owner, verificar que la cita sea de su negocio
  if (session.role === 'owner' && appointment.business.ownerId !== session.ownerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const prevStatus = appointment.status
  const prevDate = appointment.date

  const data: {
    status?: string
    depositPaid?: boolean
    depositAmount?: number
    date?: Date
  } = {}
  if (status) data.status = status
  if (typeof depositPaid === 'boolean') data.depositPaid = depositPaid
  if (typeof depositAmount === 'number') data.depositAmount = depositAmount

  // Reprogramación (solo dueño/admin): valida solapamientos.
  // El dueño puede mover libremente (sin restricción de horario de disponibilidad).
  if (date !== undefined) {
    const newDate = new Date(date)
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }
    if (['completada', 'cancelada'].includes(appointment.status)) {
      return NextResponse.json(
        { error: `No se puede reprogramar una cita ${appointment.status}` },
        { status: 400 }
      )
    }
    const durationMin = (await db.service.findUnique({ where: { id: appointment.serviceId } }))
      ?.durationMin || 30
    const newEnd = new Date(newDate.getTime() + durationMin * 60 * 1000)

    // Choca con otras citas del mismo día (excluyendo esta)
    const sameDay = await db.appointment.findMany({
      where: {
        businessId: appointment.businessId,
        id: { not: id },
        status: { in: ['pendiente', 'confirmada'] },
        date: {
          gte: new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate()),
          lt: new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate() + 1),
        },
      },
      include: { service: true },
    })
    const conflict = sameDay.some((c) => {
      const cEnd = new Date(c.date.getTime() + (c.service?.durationMin || 60) * 60 * 1000)
      return newDate < cEnd && newEnd > c.date
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'La nueva fecha y hora choca con otra cita' },
        { status: 409 }
      )
    }

    data.date = newDate
  }

  // Lógica: si se marca depósito pagado, automáticamente confirma
  if (depositPaid === true && !appointment.depositPaid) {
    data.depositPaid = true
    data.status = 'confirmada'
    if (depositAmount !== undefined) data.depositAmount = depositAmount
  }

  const updated = await db.appointment.update({
    where: { id },
    data,
    include: { service: true, business: { include: { owner: true } } },
  })

  // ===== NOTIFICACIONES AL CLIENTE (link wa.me real + push) =====
  // Se avisa cuando la cita cambia de estado o de fecha.
  const statusChanged = typeof status === 'string' && status !== prevStatus
  const dateChanged = data.date !== undefined && data.date.getTime() !== prevDate.getTime()
  const depositConfirmed = depositPaid === true && !appointment.depositPaid

  let customerNotification: {
    to: string
    message: string
    link: string | null
    sent: boolean
    simulated: boolean
  } | null = null

  if (statusChanged || dateChanged || depositConfirmed) {
    const ctx = {
      businessName: updated.business.name,
      customerName: updated.customerName,
      serviceName: updated.service?.name || '',
      date: updated.date,
    }
    let message: string | null = null
    if (depositConfirmed || (statusChanged && updated.status === 'confirmada')) {
      message = msgConfirmed(ctx)
    } else if (updated.status === 'cancelada' && prevStatus !== 'cancelada') {
      message = msgCancelled(ctx)
    } else if (updated.status === 'completada' && prevStatus !== 'completada') {
      message = msgCompleted(ctx)
    } else if (dateChanged) {
      message = msgRescheduled(ctx)
    }

    if (message) {
      const link = waLink(updated.customerPhone, message)
      customerNotification = {
        to: updated.customerPhone,
        message,
        link,
        sent: link !== null,
        simulated: link === null,
      }
      // Push al cliente (si se suscribió desde "Mis citas" o tras agendar)
      if (updated.customerHash) {
        pushToCustomer(updated.customerHash, {
          title: `${updated.business.name}`,
          body: message.replace(/\*/g, '').split('\n').filter(Boolean).slice(1).join(' · ').slice(0, 120),
          url: '#/mis-citas',
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ...updated, customerNotification })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const appointment = await db.appointment.findUnique({
    where: { id },
    include: { business: true },
  })
  if (!appointment) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }
  if (session.role === 'owner' && appointment.business.ownerId !== session.ownerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await db.appointment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
