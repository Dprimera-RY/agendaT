import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.role) {
    return NextResponse.json({ role: null })
  }
  // Si es owner, incluir sus negocios
  let businesses: { id: string; slug: string; name: string }[] = []
  if (session.role === 'owner' && session.ownerId) {
    businesses = await db.business.findMany({
      where: { ownerId: session.ownerId },
      select: { id: true, slug: true, name: true },
    })
  }
  return NextResponse.json({ ...session, businesses })
}
