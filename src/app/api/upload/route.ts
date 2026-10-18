import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'

// Subida de imágenes de negocio (logo + 3 fotos) al servidor.
// - Con businessId + slot (logo|img1|img2|img3): nombre fijo => se sobreescriben
//   al cambiar la foto (máximo 4 imágenes por tienda).
// - Sin businessId: nombre aleatorio (subida previa a la creación del negocio).
// Archivos en public/uploads/ (servidos como /uploads/... en dev y deploy).
const SLOTS = ['logo', 'img1', 'img2', 'img3']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const businessId = formData.get('businessId')
    const slot = formData.get('slot')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!ALLOWED[file.type]) {
      return NextResponse.json(
        { error: 'Formato no soportado (usa JPG, PNG, WebP, GIF o AVIF)' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Imagen demasiado grande (máx. 5 MB)' }, { status: 400 })
    }

    let filename: string
    if (typeof businessId === 'string' && businessId && typeof slot === 'string' && SLOTS.includes(slot)) {
      // Sobrescribe la foto anterior del mismo slot (4 fotos por tienda)
      filename = `${businessId.replace(/[^a-zA-Z0-9_-]/g, '')}-${slot}.${ALLOWED[file.type]}`
    } else {
      filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ALLOWED[file.type]}`
    }

    const dir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, filename), buffer)

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error al subir' }, { status: 500 })
  }
}
