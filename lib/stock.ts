import { prisma } from './prisma'
import { TransactionType } from './constants'
import { Prisma } from '@prisma/client'

type PrismaTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export async function updateStock(
  itemId: string,
  quantity: number,
  type: TransactionType,
  userId: string,
  reason: string,
  transactionId?: string,
  tx?: PrismaTransaction
) {
  const db = tx || prisma;
  
  const item = await db.item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    throw new Error('Item not found')
  }

  const previousStock = item.currentStock
  let newStock: number

  if (type === TransactionType.MASUK) {
    newStock = previousStock + quantity
  } else {
    newStock = previousStock - quantity
    if (newStock < 0) {
      throw new Error('Stock tidak boleh minus')
    }
  }

  // Update stock
  await db.item.update({
    where: { id: itemId },
    data: { currentStock: newStock },
  })

  // Create stock history
  await db.stockHistory.create({
    data: {
      itemId,
      transactionId: transactionId || null,
      userId,
      previousStock,
      quantity: type === TransactionType.MASUK ? quantity : -quantity,
      newStock,
      reason,
    },
  })

  return { previousStock, newStock }
}

/**
 * Reserve stock untuk SPK IN_PROGRESS
 * Meningkatkan reservedStock tanpa mengurangi currentStock
 * Stok di-reserve agar tidak bisa digunakan SPK lain
 */
export async function reserveStock(
  itemId: string,
  quantity: number,
  userId: string,
  reason: string,
  tx?: PrismaTransaction
) {
  const db = tx || prisma;
  
  const item = await db.item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    throw new Error('Item not found')
  }

  // Cek available stock (currentStock - reservedStock)
  const availableStock = item.currentStock - item.reservedStock
  if (availableStock < quantity) {
    throw new Error(
      `Stok tidak mencukupi. Stok tersedia: ${availableStock}, dibutuhkan: ${quantity}`
    )
  }

  const previousReservedStock = item.reservedStock
  const newReservedStock = previousReservedStock + quantity

  // Update reserved stock
  await db.item.update({
    where: { id: itemId },
    data: { reservedStock: newReservedStock },
  })

  // Create stock history untuk tracking reservasi
  await db.stockHistory.create({
    data: {
      itemId,
      userId,
      previousStock: item.currentStock,
      quantity: 0, // Tidak mengubah currentStock, hanya reservedStock
      newStock: item.currentStock,
      reason: `[RESERVE] ${reason}`,
    },
  })

  return { 
    previousReservedStock, 
    newReservedStock,
    availableStock: item.currentStock - newReservedStock
  }
}

/**
 * Release reserved stock (untuk SPK dibatalkan atau status kembali ke QUEUE)
 * Mengurangi reservedStock tanpa mengubah currentStock
 */
export async function releaseReservedStock(
  itemId: string,
  quantity: number,
  userId: string,
  reason: string,
  tx?: PrismaTransaction
) {
  const db = tx || prisma;
  
  const item = await db.item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    throw new Error('Item not found')
  }

  if (item.reservedStock < quantity) {
    throw new Error(
      `Reserved stock tidak mencukupi. Reserved: ${item.reservedStock}, akan di-release: ${quantity}`
    )
  }

  const previousReservedStock = item.reservedStock
  const newReservedStock = previousReservedStock - quantity

  // Update reserved stock
  await db.item.update({
    where: { id: itemId },
    data: { reservedStock: newReservedStock },
  })

  // Create stock history untuk tracking release
  await db.stockHistory.create({
    data: {
      itemId,
      userId,
      previousStock: item.currentStock,
      quantity: 0, // Tidak mengubah currentStock, hanya reservedStock
      newStock: item.currentStock,
      reason: `[RELEASE] ${reason}`,
    },
  })

  return { 
    previousReservedStock, 
    newReservedStock,
    availableStock: item.currentStock - newReservedStock
  }
}

/**
 * Fulfill reserved stock (mengambil barang dari gudang)
 * Mengurangi BOTH reservedStock DAN currentStock
 * Dipanggil saat barang FROM_STOCK benar-benar diambil dari gudang
 */
export async function fulfillReservedStock(
  itemId: string,
  quantity: number,
  userId: string,
  reason: string,
  transactionId?: string,
  tx?: PrismaTransaction
) {
  const db = tx || prisma;
  
  const item = await db.item.findUnique({
    where: { id: itemId },
  })

  if (!item) {
    throw new Error('Item not found')
  }

  if (item.reservedStock < quantity) {
    throw new Error(
      `Reserved stock tidak mencukupi. Reserved: ${item.reservedStock}, akan di-fulfill: ${quantity}`
    )
  }

  if (item.currentStock < quantity) {
    throw new Error(
      `Current stock tidak mencukupi. Current: ${item.currentStock}, akan di-fulfill: ${quantity}`
    )
  }

  const previousReservedStock = item.reservedStock
  const previousCurrentStock = item.currentStock
  const newReservedStock = previousReservedStock - quantity
  const newCurrentStock = previousCurrentStock - quantity

  // Update both reservedStock and currentStock
  await db.item.update({
    where: { id: itemId },
    data: { 
      reservedStock: newReservedStock,
      currentStock: newCurrentStock,
    },
  })

  // Create stock history
  await db.stockHistory.create({
    data: {
      itemId,
      transactionId: transactionId || null,
      userId,
      previousStock: previousCurrentStock,
      quantity: -quantity,
      newStock: newCurrentStock,
      reason: `[FULFILL] ${reason}`,
    },
  })

  return { 
    previousReservedStock, 
    newReservedStock,
    previousCurrentStock,
    newCurrentStock,
    availableStock: newCurrentStock - newReservedStock
  }
}

/**
 * Get available stock (currentStock - reservedStock)
 * Stok yang benar-benar tersedia untuk SPK baru
 */
export async function getAvailableStock(
  itemId: string,
  tx?: PrismaTransaction
): Promise<number> {
  const db = tx || prisma;
  
  const item = await db.item.findUnique({
    where: { id: itemId },
    select: {
      currentStock: true,
      reservedStock: true,
    }
  })

  if (!item) {
    throw new Error('Item not found')
  }

  return item.currentStock - item.reservedStock
}


