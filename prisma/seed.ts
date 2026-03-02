import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { UserRole } from '../lib/constants'

const prisma = new PrismaClient()

async function main() {
  // Create default users
  const superadminPassword = await bcrypt.hash('admin123', 10)
  const adminPassword = await bcrypt.hash('admin123', 10)

  const superadmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      password: superadminPassword,
      name: 'Super Admin',
      role: UserRole.SUPERADMIN,
    },
  })

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: 'Admin Gudang',
      role: UserRole.ADMIN_GUDANG,
    },
  })

  // Create default item types
  const itemTypes = [
    { name: 'Biji Plastik' },
    { name: 'Pigmen' },
    { name: 'Barang Jadi' },
    { name: 'Bahan Baku Lainnya' },
  ]

  for (const itemType of itemTypes) {
    await prisma.itemType.upsert({
      where: { name: itemType.name },
      update: {},
      create: { ...itemType, category: 'BAHAN_BAKU' },
    })
  }

  // Create default units
  const units = [
    { name: 'Kg' },
    { name: 'Pcs' },
    { name: 'Roll' },
    { name: 'Ball' },
    { name: 'Pack' },
  ]

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: {},
      create: unit,
    })
  }

  console.log('Seed completed!')
  console.log('Default users created:')
  console.log('- superadmin / admin123')
  console.log('- admin / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


