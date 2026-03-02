import { prisma } from "./prisma";
import { TransactionType } from "./constants";
import { Prisma } from "@prisma/client";

type PrismaTransaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

const getDb = (tx?: PrismaTransaction) => tx ?? prisma;

/**
 * =========================
 * UPDATE STOCK (MASUK / KELUAR LANGSUNG)
 * =========================
 * Digunakan untuk:
 * - Barang masuk gudang
 * - Barang keluar NON-SPK
 */
export async function updateStock(
  itemId: string,
  quantity: number,
  type: TransactionType,
  userId: string,
  reason: string,
  transactionId?: string,
  tx?: PrismaTransaction,
) {
  const db = getDb(tx);

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");

  const prev = item.currentStock;
  const next =
    type === TransactionType.MASUK ? prev + quantity : prev - quantity;

  if (next < 0) {
    throw new Error("Stock tidak boleh minus");
  }

  await db.item.update({
    where: { id: itemId },
    data: { currentStock: next },
  });

  await db.stockHistory.create({
    data: {
      itemId,
      userId,
      transactionId: transactionId ?? null,
      previousStock: prev,
      quantity: type === TransactionType.MASUK ? quantity : -quantity,
      newStock: next,
      reason,
    },
  });

  return { previousStock: prev, newStock: next };
}

/**
 * =========================
 * RESERVE STOCK (SPK DIBUAT)
 * =========================
 * - currentStock ❌ TIDAK berubah
 * - reservedStock +qty
 */
export async function reserveStock(
  itemId: string,
  quantity: number,
  userId: string,
  reason: string,
  tx?: PrismaTransaction,
) {
  const db = getDb(tx);
  const qty = Number(quantity);

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");

  const available = item.currentStock - item.reservedStock;
  if (available < qty) {
    throw new Error(
      `Stok tidak mencukupi. Available: ${available}, dibutuhkan: ${qty}`,
    );
  }

  await db.item.update({
    where: { id: itemId },
    data: {
      reservedStock: { increment: qty },
    },
  });

  // ❗ tidak mengubah stok fisik → history quantity = 0
  await db.stockHistory.create({
    data: {
      itemId,
      userId,
      transactionId: null,
      previousStock: item.currentStock,
      quantity: 0,
      newStock: item.currentStock,
      reason: `[RESERVE] ${reason}`,
    },
  });
}

/**
 * =========================
 * RELEASE / REJECT SPK
 * =========================
 * - currentStock ❌ TIDAK berubah
 * - reservedStock -qty
 */
export async function releaseReservedStock(
  itemId: string,
  quantity: number,
  userId: string,
  reason: string,
  tx?: PrismaTransaction,
) {
  const db = getDb(tx);
  const qty = Number(quantity);

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");

  if (item.reservedStock < qty) {
    throw new Error("Reserved stock tidak mencukupi");
  }

  await db.item.update({
    where: { id: itemId },
    data: {
      reservedStock: { decrement: qty },
    },
  });

  await db.stockHistory.create({
    data: {
      itemId,
      userId,
      transactionId: null,
      previousStock: item.currentStock,
      quantity: 0,
      newStock: item.currentStock,
      reason: `[RELEASE] ${reason}`,
    },
  });
}

/**
 * =========================
 * FULFILL RESERVED STOCK
 * =========================
 * Barang benar-benar keluar gudang
 *
 * - reservedStock -qty
 * - currentStock -qty
 */
export async function fulfillReservedStock(
  itemId: string,
  quantity: number,
  userId: string,
  reason: string,
  transactionId?: string,
  tx?: PrismaTransaction,
) {
  const db = getDb(tx);
  const qty = Number(quantity);

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Item not found");

  if (item.reservedStock < qty) {
    throw new Error("Reserved stock tidak mencukupi");
  }

  if (item.currentStock < qty) {
    throw new Error("Stock fisik tidak mencukupi");
  }

  const prev = item.currentStock;

  await db.item.update({
    where: { id: itemId },
    data: {
      reservedStock: { decrement: qty },
      currentStock: { decrement: qty },
    },
  });

  await db.stockHistory.create({
    data: {
      itemId,
      userId,
      transactionId: transactionId ?? null,
      previousStock: prev,
      quantity: -qty,
      newStock: prev - qty,
      reason: `[FULFILL] ${reason}`,
    },
  });
}

/**
 * =========================
 * GET AVAILABLE STOCK
 * =========================
 */
export async function getAvailableStock(
  itemId: string,
  tx?: PrismaTransaction,
): Promise<number> {
  const db = getDb(tx);

  const item = await db.item.findUnique({
    where: { id: itemId },
    select: {
      currentStock: true,
      reservedStock: true,
    },
  });

  if (!item) throw new Error("Item not found");

  return item.currentStock - item.reservedStock;
}
