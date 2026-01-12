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


