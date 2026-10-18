import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Configuración pública mínima para la app (número de soporte del admin)
export async function GET() {
  const setting = await db.setting.findUnique({ where: { key: 'supportPhone' } })
  return NextResponse.json({ supportPhone: setting?.value || null })
}
