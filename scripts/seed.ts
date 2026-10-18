// Seed script - inicializa admin root, categorías y datos de ejemplo
import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Iniciando seed...')

  // 1. Admin root
  const admin = await db.admin.upsert({
    where: { username: 'root' },
    update: {},
    create: {
      username: 'root',
      password: '123',
      name: 'Administrador Root',
    },
  })
  console.log('✅ Admin creado:', admin.username)

  // 2. Categorías
  const categories = [
    { name: 'Peluquería', slug: 'peluqueria', icon: 'Scissors', description: 'Cortes, peinados y tratamientos capilares' },
    { name: 'Barbería', slug: 'barberia', icon: 'Sparkles', description: 'Cortes masculinos y arreglo de barba' },
    { name: 'Spa y Estética', slug: 'spa-estetica', icon: 'Flower2', description: 'Tratamientos faciales, masajes y bienestar' },
    { name: 'Uñas y Manicura', slug: 'unas-manicura', icon: 'Hand', description: 'Manicura, pedicura y arte en uñas' },
    { name: 'Dentista', slug: 'dentista', icon: 'Smile', description: 'Odontología y cuidado dental' },
    { name: 'Fisioterapia', slug: 'fisioterapia', icon: 'Activity', description: 'Rehabilitación y terapia física' },
    { name: 'Tatuajes', slug: 'tatuajes', icon: 'Brush', description: 'Tatuajes artísticos y piercings' },
    { name: 'Mecánica', slug: 'mecanica', icon: 'Wrench', description: 'Reparación y mantenimiento de vehículos' },
    { name: 'Veterinaria', slug: 'veterinaria', icon: 'PawPrint', description: 'Cuidado de mascotas y consultas' },
    { name: 'Fotografía', slug: 'fotografia', icon: 'Camera', description: 'Sesiones fotográficas y eventos' },
  ]

  for (const c of categories) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    })
  }
  console.log(`✅ ${categories.length} categorías creadas`)

  // 3. Dueño de negocio demo
  const owner = await db.businessOwner.upsert({
    where: { username: 'estudio_aura' },
    update: {},
    create: {
      username: 'estudio_aura',
      password: 'aura123',
      name: 'Laura Méndez',
      emailVerified: true,
      email: 'laura@estudioaura.com',
      phone: '+5355550111',
    },
  })

  const catSpa = await db.category.findUnique({ where: { slug: 'spa-estetica' } })
  if (!catSpa) throw new Error('Categoría spa no encontrada')

  const business = await db.business.upsert({
    where: { slug: 'estudio-aura' },
    update: {},
    create: {
      slug: 'estudio-aura',
      name: 'Estudio Aura',
      description: 'Estudio de estética facial y corporal. Tratamientos personalizados con tecnología de última generación.',
      ownerId: owner.id,
      categoryId: catSpa.id,
      address: 'Calle 23 #456, La Habana',
      phone: '+5355550111',
      email: 'hola@estudioaura.com',
    },
  })

  const now = new Date()
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  await db.license.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      startDate: now,
      endDate: endDate,
      durationDays: 30,
      active: true,
      notes: 'Licencia de prueba gratuita',
    },
  })

  const services = [
    { name: 'Limpieza facial profunda', description: 'Tratamiento completo de limpieza e hidratación', price: 35, durationMin: 60 },
    { name: 'Masaje relajante', description: 'Masaje corporal de 60 minutos', price: 45, durationMin: 60 },
    { name: 'Depilación láser axilas', description: 'Sesión de depilación láser', price: 25, durationMin: 30 },
    { name: 'Radiofrecuencia facial', description: 'Tratamiento antiedad con radiofrecuencia', price: 50, durationMin: 45 },
  ]
  for (const s of services) {
    await db.service.create({
      data: { ...s, businessId: business.id },
    })
  }

  for (const dow of [1, 2, 3, 4, 5, 6]) {
    await db.availability.create({
      data: {
        businessId: business.id,
        dayOfWeek: dow,
        startTime: '09:00',
        endTime: '18:00',
        active: true,
      },
    })
  }

  // Segundo negocio: Barbería
  const owner2 = await db.businessOwner.upsert({
    where: { username: 'kings_barber' },
    update: {},
    create: {
      username: 'kings_barber',
      password: 'kings123',
      name: 'Carlos King',
      emailVerified: true,
      phone: '+5355550222',
    },
  })
  const catBarberia = await db.category.findUnique({ where: { slug: 'barberia' } })
  if (!catBarberia) throw new Error('Categoría barberia no encontrada')

  const biz2 = await db.business.upsert({
    where: { slug: 'kings-barber' },
    update: {},
    create: {
      slug: 'kings-barber',
      name: "King's Barber",
      description: 'Barbería clásica y moderna. Cortes, arreglo de barba y tratamientos capilares.',
      ownerId: owner2.id,
      categoryId: catBarberia.id,
      address: 'Av. Malecón 1234, La Habana',
      phone: '+5355550222',
    },
  })

  await db.license.upsert({
    where: { businessId: biz2.id },
    update: {},
    create: {
      businessId: biz2.id,
      startDate: now,
      endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      durationDays: 60,
      active: true,
    },
  })

  const services2 = [
    { name: 'Corte clásico', description: 'Corte de cabello tradicional', price: 10, durationMin: 30 },
    { name: 'Corte + Barba', description: 'Corte de cabello y arreglo de barba', price: 15, durationMin: 45 },
    { name: 'Diseño de cejas', description: 'Perfilado de cejas', price: 5, durationMin: 15 },
  ]
  for (const s of services2) {
    await db.service.create({
      data: { ...s, businessId: biz2.id },
    })
  }
  for (const dow of [1, 2, 3, 4, 5, 6]) {
    await db.availability.create({
      data: {
        businessId: biz2.id,
        dayOfWeek: dow,
        startTime: '10:00',
        endTime: '19:00',
        active: true,
      },
    })
  }

  // Tercer negocio: Peluquería
  const owner3 = await db.businessOwner.upsert({
    where: { username: 'glamour_hair' },
    update: {},
    create: {
      username: 'glamour_hair',
      password: 'glamour123',
      name: 'Ana Glamour',
      emailVerified: true,
      phone: '+5355550333',
    },
  })
  const catPelu = await db.category.findUnique({ where: { slug: 'peluqueria' } })
  if (!catPelu) throw new Error('Categoría peluqueria no encontrada')

  const biz3 = await db.business.upsert({
    where: { slug: 'glamour-hair' },
    update: {},
    create: {
      slug: 'glamour-hair',
      name: 'Glamour Hair Studio',
      description: 'Peluquería unisex. Color, mechas, alisado y tratamientos capilares premium.',
      ownerId: owner3.id,
      categoryId: catPelu.id,
      address: 'Calle O #100, La Habana',
      phone: '+5355550333',
    },
  })

  await db.license.upsert({
    where: { businessId: biz3.id },
    update: {},
    create: {
      businessId: biz3.id,
      startDate: now,
      endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      durationDays: 45,
      active: true,
    },
  })

  const services3 = [
    { name: 'Corte mujer', description: 'Corte y peinado para dama', price: 20, durationMin: 60 },
    { name: 'Mechas', description: 'Mechas completas', price: 50, durationMin: 120 },
    { name: 'Alisado', description: 'Tratamiento de alisado brasileño', price: 80, durationMin: 180 },
    { name: 'Tinte', description: 'Coloración completa', price: 35, durationMin: 90 },
  ]
  for (const s of services3) {
    await db.service.create({
      data: { ...s, businessId: biz3.id },
    })
  }
  for (const dow of [2, 3, 4, 5, 6]) {
    await db.availability.create({
      data: {
        businessId: biz3.id,
        dayOfWeek: dow,
        startTime: '09:00',
        endTime: '17:00',
        active: true,
      },
    })
  }

  console.log('✅ Seed completado!')
  console.log('   - Admin: root / 123')
  console.log('   - Dueño 1: estudio_aura / aura123')
  console.log('   - Dueño 2: kings_barber / kings123')
  console.log('   - Dueño 3: glamour_hair / glamour123')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
