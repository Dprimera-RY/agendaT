import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Lista todas las configuraciones globales (solo admin)
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const settings = await db.setting.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json(settings)
}

// Crear/actualizar una configuración global (solo admin)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { key, value } = await req.json()
    if (!key || typeof value !== 'string') {
      return NextResponse.json(
        { error: 'key y value (string) son requeridos' },
        { status: 400 }
      )
    }
    const allowed = ['supportPhone']
    if (!allowed.includes(key)) {
      return NextResponse.json({ error: 'Clave no permitida' }, { status: 400 })
    }
    const setting = await db.setting.upsert({
      where: { key },
      create: { key, value: value.trim() },
      update: { value: value.trim() },
    })
    return NextResponse.json(setting)
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
