import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Configuración pública mínima para la app (soporte y precio de certificación)
export async function GET() {
  const [support, certPrice] = await Promise.all([
    db.setting.findUnique({ where: { key: 'supportPhone' } }),
    db.setting.findUnique({ where: { key: 'certificationPrice' } }),
  ])
  return NextResponse.json({
    supportPhone: support?.value || null,
    certificationPrice: certPrice ? Number(certPrice.value) || 0 : 0,
  })
}
