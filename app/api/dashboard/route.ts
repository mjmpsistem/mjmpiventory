import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ItemCategory, TransactionType, TransactionSource } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.FOUNDER,
      UserRole.KEPALA_INVENTORY,
      UserRole.ADMIN
    ])
    
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const today = new Date()

    let startOfDay: Date
    let endOfDay: Date

    if (fromParam && toParam) {
      startOfDay = new Date(fromParam)
      startOfDay.setHours(0, 0, 0, 0)
      endOfDay = new Date(toParam)
      endOfDay.setHours(23, 59, 59, 999)
    } else {
      startOfDay = new Date(today)
      startOfDay.setHours(0, 0, 0, 0)
      endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)
    }

    // 90 days ago for slow moving items
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // 7 days ago for PR pending
    const sevenDaysAgoForPR = new Date(today)
    sevenDaysAgoForPR.setDate(sevenDaysAgoForPR.getDate() - 7)

    // 3 days from now for PO jatuh tempo
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    threeDaysFromNow.setHours(23, 59, 59, 999)

    // Parallel Database Queries
    const [
      totalBahanBaku,
      totalBarangJadi,
      allItems,
      barangMasukStats,
      barangKeluarStats,
      recentTransactions,
      recentProductionRequests,
      recentPurchaseOrders,
      itemsWithPrice,
      topBarangKeluarRaw,
      transactionsInPeriod,
      poJatuhTempo,
      prPending,
      wasteStocks,
      recentRecycledTransactions,
      efficiencyInput,
      efficiencyOutput,
      wasteGeneratedStats
    ] = await Promise.all([
      // Total stok bahan baku
      prisma.item.aggregate({
        where: { category: ItemCategory.BAHAN_BAKU, isActive: true },
        _sum: { currentStock: true }
      }),
      // Total stok barang jadi
      prisma.item.aggregate({
        where: { category: ItemCategory.BARANG_JADI, isActive: true },
        _sum: { currentStock: true }
      }),
      // All items for stock minimum and categories
      prisma.item.findMany({
        where: { isActive: true },
        include: { itemType: true, unit: true }
      }),
      // Barang masuk periode ini
      prisma.transaction.aggregate({
        where: { type: TransactionType.MASUK, date: { gte: startOfDay, lte: endOfDay } },
        _sum: { quantity: true },
        _count: { id: true }
      }),
      // Barang keluar periode ini
      prisma.transaction.aggregate({
        where: { type: TransactionType.KELUAR, date: { gte: startOfDay, lte: endOfDay } },
        _sum: { quantity: true },
        _count: { id: true }
      }),
      // Recent Activities
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { item: { include: { unit: true } }, user: { select: { name: true } } }
      }),
      prisma.productionRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } }
      }),
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } }
      }),
      // Items with price for valuation
      prisma.item.findMany({
        where: { isActive: true },
        include: {
          transactions: {
            where: { type: TransactionType.MASUK, price: { not: null } },
            orderBy: { date: 'asc' },
            select: { quantity: true, price: true }
          }
        }
      }),
      // Top barang keluar
      prisma.transaction.groupBy({
        by: ['itemId'],
        where: { type: TransactionType.KELUAR, date: { gte: startOfDay, lte: endOfDay } },
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      }),
      // Trend data
      prisma.transaction.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          type: { in: [TransactionType.MASUK, TransactionType.KELUAR] }
        },
        select: { date: true, type: true, quantity: true },
        orderBy: { date: 'asc' }
      }),
      // PO Jatuh Tempo
      prisma.purchaseOrder.findMany({
        where: { jatuhTempo: { lte: threeDaysFromNow }, status: { not: 'DONE' } },
        include: { user: { select: { name: true } }, items: true },
        orderBy: { jatuhTempo: 'asc' },
        take: 10
      }),
      // PR Pending
      prisma.productionRequest.findMany({
        where: { status: 'PENDING' },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10
      }),
      // Waste Stocks
      prisma.wasteStock.findMany({
        where: { quantity: { gt: 0 } },
        include: { material: { include: { itemType: true, unit: true } } }
      }),
      // Recent Recycled
      prisma.transaction.findMany({
        where: { source: TransactionSource.DAUR_ULANG, date: { gte: startOfDay, lte: endOfDay } },
        include: { item: { include: { unit: true } }, user: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take: 5
      }),
      // Production Efficiency: Input
      prisma.transaction.aggregate({
        where: { type: TransactionType.KELUAR, date: { gte: startOfDay, lte: endOfDay }, item: { category: ItemCategory.BAHAN_BAKU } },
        _sum: { quantity: true }
      }),
      // Production Efficiency: Output
      prisma.transaction.aggregate({
        where: { type: TransactionType.MASUK, source: TransactionSource.PRODUKSI, date: { gte: startOfDay, lte: endOfDay } },
        _sum: { quantity: true }
      }),
      // Production Efficiency: Waste
      prisma.wasteStock.aggregate({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
        _sum: { quantity: true }
      })
    ])

    // Process Stock Value and Slow Moving Items in memory to keep queries efficient
    let totalNilaiStok = 0
    const itemsWithStockValue = []
    const slowMovingItems = []

    for (const item of itemsWithPrice) {
      if (item.currentStock > 0) {
        let totalValue = 0
        let totalQuantity = 0
        for (const tx of item.transactions) {
          if (tx.price && tx.price > 0 && tx.quantity > 0) {
            totalValue += tx.quantity * tx.price
            totalQuantity += tx.quantity
          }
        }
        const weightedAvgPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0
        const hargaSatuan = item.hargaSatuan && item.hargaSatuan > 0 ? item.hargaSatuan : weightedAvgPrice
        const stockValue = Math.round(item.currentStock * hargaSatuan * 100) / 100
        totalNilaiStok += stockValue
        itemsWithStockValue.push({
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          currentStock: item.currentStock,
          stockValue: stockValue,
          unit: (allItems.find(i => i.id === item.id)?.unit?.name) || ''
        })

        // Slow Moving Items Check (currentStock > 0 and low movement in 90 days)
        // Note: For real slow moving, we'd need a separate 90-day transaction query or count
        // For now, let's keep it simple or accept that we'll calculate this in another pass if needed.
        // Actually, the server action 'getSlowMovingItems' did a separate query.
      }
    }

    // Secondary query for slow moving items (can't easily do in the first bulk without hitting the transaction table hard)
    // We'll only fetch transactions for items that HAVE stock.
    const itemsWithPotentialSlowMoving = allItems.filter(i => i.currentStock > 0)
    const slowMovingData = await prisma.item.findMany({
      where: { id: { in: itemsWithPotentialSlowMoving.map(i => i.id) } },
      include: {
        unit: true,
        transactions: {
          where: { type: TransactionType.KELUAR, date: { gte: ninetyDaysAgo } },
          select: { quantity: true }
        }
      }
    })

    const processedSlowMoving = slowMovingData.map(item => {
      const totalOut = item.transactions.reduce((acc, tx) => acc + tx.quantity, 0)
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        stock: item.currentStock,
        unit: item.unit.name,
        totalOut90Days: totalOut
      }
    })
    .filter(item => item.totalOut90Days === 0 || item.totalOut90Days < (item.stock * 0.1))
    .sort((a, b) => a.totalOut90Days - b.totalOut90Days)
    .slice(0, 5)

    // Process Top Items Details (Avoid N+1)
    const topItemIds = topBarangKeluarRaw.map(t => t.itemId)
    const topItems = allItems.filter(i => topItemIds.includes(i.id))
    const topBarangKeluar = topBarangKeluarRaw.map(tx => {
      const item = topItems.find(i => i.id === tx.itemId)
      return {
        itemId: tx.itemId,
        itemName: item?.name || 'Unknown',
        itemCode: item?.code || '',
        totalQuantity: tx._sum.quantity || 0,
        totalTransactions: tx._count.id || 0,
        unit: item?.unit?.name || ''
      }
    })

    // Trend Data Processing
    const trendData: Record<string, { masuk: number; keluar: number }> = {}
    const dayDiff = Math.ceil((endOfDay.getTime() - startOfDay.getTime()) / (1000 * 3600 * 24))
    if (dayDiff <= 60) {
      const loopDate = new Date(startOfDay)
      while (loopDate <= endOfDay) {
        trendData[loopDate.toISOString().split('T')[0]] = { masuk: 0, keluar: 0 }
        loopDate.setDate(loopDate.getDate() + 1)
      }
    }
    transactionsInPeriod.forEach(tx => {
      const dateStr = tx.date.toISOString().split('T')[0]
      if (!trendData[dateStr]) trendData[dateStr] = { masuk: 0, keluar: 0 }
      if (tx.type === TransactionType.MASUK) trendData[dateStr].masuk += tx.quantity
      else trendData[dateStr].keluar += tx.quantity
    })
    const chartData = Object.entries(trendData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, values]) => ({ date, masuk: values.masuk, keluar: values.keluar }))

    // Waste Breakdown Processing
    const totalWasteWeight = wasteStocks.reduce((acc, curr) => acc + curr.quantity, 0)
    const wasteBreakdownMap = new Map<string, { name: string; quantity: number; unit: string }>()
    wasteStocks.forEach(w => {
      const key = w.material.id
      if (!wasteBreakdownMap.has(key)) {
        wasteBreakdownMap.set(key, {
          name: w.material.name,
          quantity: 0,
          unit: w.material.unit?.name || 'kg'
        })
      }
      wasteBreakdownMap.get(key)!.quantity += w.quantity
    })
    const wasteBreakdown = Array.from(wasteBreakdownMap.values())
      .map(b => ({ ...b, quantity: Number(b.quantity.toFixed(2)) }))
      .sort((a, b) => b.quantity - a.quantity)

    // Stok Bawah Minimum
    const stokBawahMinimum = allItems.filter(item => item.currentStock < item.stockMinimum)

    return NextResponse.json({
      totalStokBahanBaku: totalBahanBaku._sum.currentStock || 0,
      totalStokBarangJadi: totalBarangJadi._sum.currentStock || 0,
      stokBawahMinimum,
      barangMasukHariIni: {
        totalQuantity: barangMasukStats._sum.quantity || 0,
        totalTransactions: barangMasukStats._count.id || 0,
      },
      barangKeluarHariIni: {
        totalQuantity: barangKeluarStats._sum.quantity || 0,
        totalTransactions: barangKeluarStats._count.id || 0,
      },
      totalNilaiStok,
      recentActivities: {
        transactions: recentTransactions,
        productionRequests: recentProductionRequests,
        purchaseOrders: recentPurchaseOrders,
      },
      topBarangKeluar,
      topNilaiStok: itemsWithStockValue.sort((a, b) => b.stockValue - a.stockValue).slice(0, 5),
      chartData,
      stokBawahMinimumByCategory: {
        BAHAN_BAKU: stokBawahMinimum.filter(i => i.category === ItemCategory.BAHAN_BAKU).length,
        BARANG_JADI: stokBawahMinimum.filter(i => i.category === ItemCategory.BARANG_JADI).length,
      },
      poJatuhTempo: poJatuhTempo.map(po => ({
        id: po.id,
        nomorPO: po.nomorPO,
        kepada: po.kepada,
        jatuhTempo: po.jatuhTempo,
        status: po.status,
        total: po.items.reduce((sum, item) => sum + item.subTotal, 0),
        user: po.user.name,
        isOverdue: po.jatuhTempo < today,
      })),
      prPending: prPending.map(pr => ({
        id: pr.id,
        spkNumber: pr.spkNumber,
        productName: pr.productName,
        status: pr.status,
        createdAt: pr.createdAt,
        user: pr.user.name,
        isOverdue: pr.createdAt < sevenDaysAgoForPR,
      })),
      // NEW CONSOLIDATED DATA
      wasteSummary: {
        totalWeight: Number(totalWasteWeight.toFixed(2)),
        breakdown: wasteBreakdown,
        recentRecycled: recentRecycledTransactions.map(tx => ({
          id: tx.id,
          date: tx.date,
          itemName: tx.item.name,
          quantity: tx.quantity,
          unit: tx.item.unit.name,
          user: tx.user.name,
          type: tx.type
        }))
      },
      productionEfficiency: {
        input: efficiencyInput._sum.quantity || 0,
        output: efficiencyOutput._sum.quantity || 0,
        waste: wasteGeneratedStats._sum.quantity || 0
      },
      slowMovingItems: processedSlowMoving
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Get dashboard error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

