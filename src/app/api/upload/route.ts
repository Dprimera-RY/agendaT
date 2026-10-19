import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { uploadsDir } from '@/lib/uploads'

// Subida de imágenes de negocio (logo + 3 fotos) al servidor.
// Los archivos se guardan en uploads/ (raíz del proyecto, fuera de public/)
// y se sirven en /uploads/... vía src/app/uploads/[...path]/route.ts.
// Nombre siempre único (timestamp + aleatorio): nunca se sobreescribe un
// archivo existente; la URL anterior queda en disco y en la DB hasta que
// el dueño guarda la nueva foto.
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

    // Prefijo opcional con businessId-slot para depurar, pero siempre con
    // sufijo único para no sobreescribir imágenes existentes.
    const prefix =
      typeof businessId === 'string' && businessId && typeof slot === 'string' && SLOTS.includes(slot)
        ? `${businessId.replace(/[^a-zA-Z0-9_-]/g, '')}-${slot}-`
        : ''
    const filename = `${prefix}${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ALLOWED[file.type]}`

    const dir = uploadsDir()
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, filename), buffer)

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error al subir' }, { status: 500 })
  }
}
