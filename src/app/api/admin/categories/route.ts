import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  return null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Listar categorías (admin, con conteo de negocios)
export async function GET() {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { businesses: true } } },
  })
  return NextResponse.json(categories)
}

// Crear categoría
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {
    const { name, slug, icon, description } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }
    const finalSlug = (slug?.trim() || slugify(name)).toLowerCase()
    const existing = await db.category.findFirst({
      where: { OR: [{ name: name.trim() }, { slug: finalSlug }] },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre o slug' },
        { status: 400 }
      )
    }
    const category = await db.category.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        icon: icon?.trim() || null,
        description: description?.trim() || null,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}

// Editar categoría
export async function PUT(req: NextRequest) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {
    const { id, name, slug, icon, description } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }
    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }
    const finalName = name?.trim() || existing.name
    const finalSlug = (slug?.trim() || existing.slug).toLowerCase()
    const duplicate = await db.category.findFirst({
      where: {
        id: { not: id },
        OR: [{ name: finalName }, { slug: finalSlug }],
      },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: 'Ya existe otra categoría con ese nombre o slug' },
        { status: 400 }
      )
    }
    const category = await db.category.update({
      where: { id },
      data: {
        name: finalName,
        slug: finalSlug,
        icon: icon?.trim() || null,
        description: description?.trim() || null,
      },
    })
    return NextResponse.json(category)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}

// Eliminar categoría (solo si no tiene negocios asociados)
export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }
  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { businesses: true } } },
  })
  if (!category) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }
  if (category._count.businesses > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: tiene ${category._count.businesses} negocio(s) asociados`,
      },
      { status: 400 }
    )
  }
  await db.category.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
