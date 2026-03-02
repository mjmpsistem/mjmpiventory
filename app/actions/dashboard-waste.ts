"use server";

import { prisma } from "@/lib/prisma";
import { TransactionSource, TransactionType } from "@/lib/constants";

export async function getWasteDashboardSummary(dateFrom?: string, dateTo?: string) {
  try {
    // 1. Total Pending Waste (Available for Recycling)
    // Filter by date if provided (though stock is usually current state, let's keep it simple for now and just show CURRENT available waste)
    // If historical tracking is needed, we'd need a more complex query on logs.
    // For "Waste Stats" card, user usually wants to know "What can I recycle NOW?"
    
    const wasteStocks = await prisma.wasteStock.findMany({
      where: {
        quantity: { gt: 0 },
      },
      include: {
        material: {
            include: {
                itemType: true,
                unit: true
            }
        },
      },
    });

    const totalWeight = wasteStocks.reduce((acc, curr) => acc + curr.quantity, 0);
    
    // Group by Item Name/Type for breakdown
    const breakdownMap = new Map<string, { name: string; quantity: number; unit: string }>();
    
    wasteStocks.forEach(w => {
        const key = w.material.itemType?.name || w.material.category || w.material.name;
        // Or simply group by Material Name to be specific
        // Let's group by Material Name to be specific as per user request "barang waste yang bisa didaurulang"
        const specificKey = w.material.id;
        
        if (!breakdownMap.has(specificKey)) {
            breakdownMap.set(specificKey, {
                name: w.material.name,
                quantity: 0,
                unit: w.material.unit?.name || 'kg'
            });
        }
        
        const current = breakdownMap.get(specificKey)!;
        current.quantity += w.quantity;
    });

    const breakdown = Array.from(breakdownMap.values())
        .map(b => ({ ...b, quantity: Number(b.quantity.toFixed(2)) })) // formatted
        .sort((a, b) => b.quantity - a.quantity);


    // 2. Recent Waste Activities (Recycling) in the selected date range
    // We look for Transactions with Source = DAUR_ULANG
    const whereTx: any = {
        source: TransactionSource.DAUR_ULANG,
    };

    if (dateFrom && dateTo) {
        whereTx.date = {
          gte: new Date(dateFrom),
          lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)),
        };
    }

    const recentRecycled = await prisma.transaction.findMany({
        where: whereTx,
        include: {
            item: {
                include: { unit: true }
            },
            user: { select: { name: true } }
        },
        orderBy: { date: 'desc' },
        take: 5
    });

    return {
      success: true,
      data: {
        totalWeight: Number(totalWeight.toFixed(2)),
        breakdown: breakdown,
        recentRecycled: recentRecycled.map(tx => ({
            id: tx.id,
            date: tx.date,
            itemName: tx.item.name,
            quantity: tx.quantity,
            unit: tx.item.unit.name,
            user: tx.user.name,
            type: tx.type // usually MASUK (product of recycling)
        }))
      }
    };
  } catch (error) {
    console.error("Error fetching waste dashboard summary:", error);
    return { success: false, error: "Gagal memuat data waste." };
  }
}
