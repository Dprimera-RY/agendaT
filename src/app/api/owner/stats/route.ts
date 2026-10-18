import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Estadísticas del negocio para su dueño (o admin): visitas y clientes habituales
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) {
    return NextResponse.json({ error: 'businessId requerido' }, { status: 400 })
  }
  const business = await db.business.findUnique({ where: { id: businessId } })
  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }
  if (session.role === 'owner' && business.ownerId !== session.ownerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Ventana de 30 días (incluye hoy)
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - 29)

  const [visitsTotal, visits30, appointments] = await Promise.all([
    db.visit.count({ where: { businessId } }),
    db.visit.findMany({
      where: { businessId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.appointment.findMany({
      where: { businessId, createdAt: { gte: since } },
      select: {
        customerName: true,
        customerPhone: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  // Visitas por día (30 días, con ceros incluidos)
  const visitsByDay: { date: string; count: number }[] = []
  const counts = new Map<string, number>()
  for (const v of visits30) {
    const d = new Date(v.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    visitsByDay.push({ date: key, count: counts.get(key) || 0 })
  }

  // Clientes habituales (agrupados por teléfono; no canceladas)
  const byCustomer = new Map<
    string,
    { name: string; phone: string; count: number; lastDate: string; completed: number }
  >()
  for (const a of appointments) {
    if (a.status === 'cancelada') continue
    const key = a.customerPhone || a.customerName
    const cur = byCustomer.get(key) || {
      name: a.customerName,
      phone: a.customerPhone,
      count: 0,
      lastDate: a.createdAt.toISOString(),
      completed: 0,
    }
    cur.count += 1
    if (a.status === 'completada') cur.completed += 1
    if (a.createdAt > new Date(cur.lastDate)) cur.lastDate = a.createdAt.toISOString()
    cur.name = a.customerName
    byCustomer.set(key, cur)
  }
  const topCustomers = [...byCustomer.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((c) => ({ ...c, lastDate: c.lastDate }))

  return NextResponse.json({
    visitsTotal,
    visitsLast30: visits30.length,
    visitsByDay,
    topCustomers,
  })
}
