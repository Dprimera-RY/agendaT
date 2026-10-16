import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Actualizar estado de una cita (confirmar/cancelar/completar) o marcar depósito
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { status, depositPaid, depositAmount } = body

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: { business: true },
  })
  if (!appointment) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }

  // Si es owner, verificar que la cita sea de su negocio
  if (session.role === 'owner' && appointment.business.ownerId !== session.ownerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const data: {
    status?: string
    depositPaid?: boolean
    depositAmount?: number
  } = {}
  if (status) data.status = status
  if (typeof depositPaid === 'boolean') data.depositPaid = depositPaid
  if (typeof depositAmount === 'number') data.depositAmount = depositAmount

  // Lógica: si se marca depósito pagado, automáticamente confirma
  if (depositPaid === true && !appointment.depositPaid) {
    data.depositPaid = true
    data.status = 'confirmada'
    if (depositAmount !== undefined) data.depositAmount = depositAmount
  }

  const updated = await db.appointment.update({
    where: { id },
    data,
    include: { service: true, business: true },
  })

  // Si se confirmó, simular WhatsApp al cliente
  let customerNotification = null
  if (depositPaid === true && !appointment.depositPaid) {
    const customerPhone = appointment.customerPhone
    const customerMessage = `✅ *CITA CONFIRMADA*

Hola ${appointment.customerName},

Tu cita en *${appointment.business.name}* ha sido confirmada:
💅 ${updated.service?.name}
📅 ${appointment.date.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}

Te esperamos!`

    customerNotification = {
      to: customerPhone,
      message: customerMessage,
      sent: true,
      simulated: true,
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
