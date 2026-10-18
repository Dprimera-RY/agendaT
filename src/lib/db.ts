import { PrismaClient } from '@prisma/client'
import { isAbsolute, resolve } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resuelve DATABASE_URL para SQLite. El CLI de Prisma resuelve rutas relativas
// contra la carpeta del schema (prisma/), pero el PrismaClient en runtime las
// resolvería contra el CWD del proceso. Normalizamos aquí para que en dev,
// deploy y en otras máquinas se use siempre <raíz>/db/custom.db.
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL
  if (!raw) return raw
  if (!raw.startsWith('file:')) return raw
  const filePath = raw.slice('file:'.length)
  if (!filePath || isAbsolute(filePath)) return raw
  return 'file:' + resolve(process.cwd(), 'prisma', filePath)
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    datasourceUrl: resolveDatabaseUrl(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
