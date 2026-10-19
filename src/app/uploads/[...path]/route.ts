import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { uploadsDir } from '@/lib/uploads'

// Sirve imágenes subidas desde uploads/ (raíz) bajo la URL /uploads/<archivo>.
// Los archivos antiguos que siguen en public/uploads los sirve Next estático
// antes de llegar aquí; esta ruta solo atiende los que no están en public/.
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  const name = segments.join('/')
  // Seguridad: sin traversal, sin subdirectorios, solo nombre de archivo simple
  if (
    !name ||
    segments.length !== 1 ||
    name.includes('..') ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0')
  ) {
    return new NextResponse(null, { status: 400 })
  }
  const ext = path.extname(name).toLowerCase()
  const mime = MIME[ext]
  if (!mime) {
    return new NextResponse(null, { status: 404 })
  }
  try {
    const buf = await readFile(path.join(uploadsDir(), name))
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
