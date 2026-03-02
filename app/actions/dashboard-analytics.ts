"use server";

import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionSource, ItemCategory } from "@/lib/constants";

export async function getProductionEfficiency(dateFrom?: string, dateTo?: string) {
  try {
    const today = new Date();
    // Default to this month if no date provided
    const start = dateFrom ? new Date(dateFrom) : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // 1. INPUT: Total Raw Material Usage (Transaction KELUAR with Source BAHAN_BAKU or RESERVASI which turned into usage)
    // To be simplified: KELUAR with source BAHAN_BAKU (usually manually logged or auto log) or KELUAR for items category BAHAN_BAKU
    
    // Approach: Sum quantity for Transactions Type=KELUAR, Item Category=BAHAN_BAKU
    // Ideally filter by source related to production, but commonly all raw material exit is for production unless sold (trading).
    // Let's filter by category BAHAN_BAKU and type KELUAR.
    const rawMaterialUsage = await prisma.transaction.aggregate({
        where: {
            type: TransactionType.KELUAR,
            date: { gte: start, lte: end },
            item: {
                category: ItemCategory.BAHAN_BAKU
            }
        },
        _sum: { quantity: true }
    });

    // 2. OUTPUT: Total Finished Goods Produced (Transaction MASUK with Source PRODUKSI)
    const finishedGoodsOutput = await prisma.transaction.aggregate({
        where: {
            type: TransactionType.MASUK,
            source: TransactionSource.PRODUKSI,
            date: { gte: start, lte: end },
        },
        _sum: { quantity: true }
    });
    
    // 3. WASTE: Total Waste Generated (from WasteStock logs filtered by date)
    // Since WasteStock doesn't have "date" of creation perfectly indexed for range query in aggregate,
    // we use createdAt.
    const wasteGenerated = await prisma.wasteStock.aggregate({
        where: {
            createdAt: { gte: start, lte: end }
        },
        _sum: { quantity: true }
    });

    return {
        success: true,
        data: {
            input: rawMaterialUsage._sum.quantity || 0,
            output: finishedGoodsOutput._sum.quantity || 0,
            waste: wasteGenerated._sum.quantity || 0
        }
    };

  } catch (error) {
    console.error("Error fetching production efficiency:", error);
    return { success: false, error: "Gagal memuat data efisiensi." };
  }
}

export async function getSlowMovingItems() {
    try {
        // Definition: High Stock (> 0) BUT Low/No Outgoing Transactions in last 90 days.
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const items = await prisma.item.findMany({
            where: {
                currentStock: { gt: 0 },
                isActive: true
            },
            include: {
                unit: true,
                transactions: {
                    where: {
                        type: TransactionType.KELUAR,
                        date: { gte: ninetyDaysAgo }
                    },
                    select: { quantity: true }
                }
            }
        });

        // Calculate total outgoing per item
        const slowMoving = items.map(item => {
            const totalOut = item.transactions.reduce((acc, tx) => acc + tx.quantity, 0);
            return {
                id: item.id,
                code: item.code,
                name: item.name,
                stock: item.currentStock,
                unit: item.unit.name,
                totalOut90Days: totalOut
            };
        })
        .filter(item => item.totalOut90Days === 0 || item.totalOut90Days < (item.stock * 0.1)) // Criteria: No exit or less than 10% of stock moved
        .sort((a, b) => a.totalOut90Days - b.totalOut90Days) // Lowest movement first
        .slice(0, 5); // Take top 5

        return { success: true, data: slowMoving };

    } catch (error) {
        console.error("Error fetching slow moving items:", error);
        return { success: false, data: [] };
    }
}
