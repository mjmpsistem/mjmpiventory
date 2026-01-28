import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ItemCategory, TransactionType } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG, UserRole.STAFF_GUDANG])
    
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    const today = date ? new Date(date) : new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    // Total stok bahan baku
    const bahanBakuItems = await prisma.item.findMany({
      where: {
        category: ItemCategory.BAHAN_BAKU,
        isActive: true,
      },
    })
    const totalStokBahanBaku = bahanBakuItems.reduce(
      (sum, item) => sum + item.currentStock,
      0
    )

    // Total stok barang jadi
    const barangJadiItems = await prisma.item.findMany({
      where: {
        category: ItemCategory.BARANG_JADI,
        isActive: true,
      },
    })
    const totalStokBarangJadi = barangJadiItems.reduce(
      (sum, item) => sum + item.currentStock,
      0
    )

    // Stok di bawah minimum
    const allItems = await prisma.item.findMany({
      where: {
        isActive: true,
      },
      include: {
        itemType: true,
        unit: true,
      },
    })
    const stokBawahMinimum = allItems.filter(
      (item) => item.currentStock < item.stockMinimum
    )

    // Barang masuk hari ini
    const barangMasukHariIni = await prisma.transaction.aggregate({
      where: {
        type: TransactionType.MASUK,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    })

    // Barang keluar hari ini
    const barangKeluarHariIni = await prisma.transaction.aggregate({
      where: {
        type: TransactionType.KELUAR,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    })

    // Aktivitas terbaru (transaksi, production requests, purchase orders)
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        item: {
          include: {
            unit: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    const recentProductionRequests = await prisma.productionRequest.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    const recentPurchaseOrders = await prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    // Nilai stok akumulatif (weighted average price * stok)
    // Menghitung rata-rata tertimbang dari semua transaksi masuk dengan harga
    const itemsWithPrice = await prisma.item.findMany({
      where: { isActive: true },
      include: {
        transactions: {
          where: {
            type: TransactionType.MASUK,
            price: { not: null },
          },
          orderBy: { date: 'asc' },
          select: {
            quantity: true,
            price: true,
          },
        },
      },
    })

    let totalNilaiStok = 0
    const itemsWithStockValue: Array<{
      item: any
      stockValue: number
    }> = []

    for (const item of itemsWithPrice) {
      if (item.currentStock === 0) continue

      // Hitung weighted average price dari semua transaksi masuk
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
      
      itemsWithStockValue.push({ item, stockValue })
    }

    // ========== DATA BARU ==========
    
    // 1. Top 5 barang paling sering keluar (30 hari terakhir)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const topBarangKeluar = await prisma.transaction.groupBy({
      by: ['itemId'],
      where: {
        type: TransactionType.KELUAR,
        date: { gte: thirtyDaysAgo },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    })

    const topBarangKeluarWithDetails = await Promise.all(
      topBarangKeluar.map(async (tx) => {
        const item = await prisma.item.findUnique({
          where: { id: tx.itemId },
          include: { unit: true },
        })
        return {
          itemId: tx.itemId,
          itemName: item?.name || 'Unknown',
          itemCode: item?.code || '',
          totalQuantity: tx._sum.quantity || 0,
          totalTransactions: tx._count.id || 0,
          unit: item?.unit?.name || '',
        }
      })
    )

    // 2. Top 5 barang dengan nilai stok terbesar
    const topNilaiStok = itemsWithStockValue
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 5)
      .map(({ item, stockValue }) => ({
        itemId: item.id,
        itemName: item.name,
        itemCode: item.code,
        currentStock: item.currentStock,
        stockValue: stockValue,
        unit: item.unit?.name || '',
      }))

    // 3. Grafik tren 7 hari terakhir (barang masuk vs keluar)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const transactions7Days = await prisma.transaction.findMany({
      where: {
        date: { gte: sevenDaysAgo },
        type: { in: [TransactionType.MASUK, TransactionType.KELUAR] },
      },
      select: {
        date: true,
        type: true,
        quantity: true,
      },
    })

    // Group by date dan type
    const trendData: Record<string, { masuk: number; keluar: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      trendData[dateStr] = { masuk: 0, keluar: 0 }
    }

    transactions7Days.forEach((tx) => {
      const dateStr = tx.date.toISOString().split('T')[0]
      if (trendData[dateStr]) {
        if (tx.type === TransactionType.MASUK) {
          trendData[dateStr].masuk += tx.quantity
        } else {
          trendData[dateStr].keluar += tx.quantity
        }
      }
    })

    const chartData = Object.entries(trendData).map(([date, values]) => ({
      date,
      masuk: values.masuk,
      keluar: values.keluar,
    }))

    // 4. Jumlah item di bawah minimum per kategori
    const stokBawahMinimumByCategory = {
      BAHAN_BAKU: stokBawahMinimum.filter((item) => item.category === ItemCategory.BAHAN_BAKU).length,
      BARANG_JADI: stokBawahMinimum.filter((item) => item.category === ItemCategory.BARANG_JADI).length,
    }

    // 5. PO yang sudah jatuh tempo atau mau jatuh tempo (3 hari ke depan)
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    threeDaysFromNow.setHours(23, 59, 59, 999)

    const poJatuhTempo = await prisma.purchaseOrder.findMany({
      where: {
        jatuhTempo: {
          lte: threeDaysFromNow,
        },
        status: { not: 'DONE' }, // Exclude yang sudah selesai
      },
      include: {
        user: {
          select: { name: true },
        },
        items: true,
      },
      orderBy: {
        jatuhTempo: 'asc',
      },
      take: 10,
    })

    // 6. Permintaan produksi yang belum approve atau overdue (>7 hari)
    const sevenDaysAgoForPR = new Date(today)
    sevenDaysAgoForPR.setDate(sevenDaysAgoForPR.getDate() - 7)

    const prPending = await prisma.productionRequest.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          {
            status: 'PENDING',
            createdAt: { lte: sevenDaysAgoForPR },
          },
        ],
      },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 10,
    })

    return NextResponse.json({
      totalStokBahanBaku,
      totalStokBarangJadi,
      stokBawahMinimum,
      barangMasukHariIni: {
        totalQuantity: barangMasukHariIni._sum.quantity || 0,
        totalTransactions: barangMasukHariIni._count.id || 0,
      },
      barangKeluarHariIni: {
        totalQuantity: barangKeluarHariIni._sum.quantity || 0,
        totalTransactions: barangKeluarHariIni._count.id || 0,
      },
      totalNilaiStok,
      recentActivities: {
        transactions: recentTransactions,
        productionRequests: recentProductionRequests,
        purchaseOrders: recentPurchaseOrders,
      },
      // Data baru
      topBarangKeluar: topBarangKeluarWithDetails,
      topNilaiStok,
      chartData,
      stokBawahMinimumByCategory,
      poJatuhTempo: poJatuhTempo.map((po) => ({
        id: po.id,
        nomorPO: po.nomorPO,
        kepada: po.kepada,
        jatuhTempo: po.jatuhTempo,
        status: po.status,
        total: po.items.reduce((sum, item) => sum + item.subTotal, 0),
        user: po.user.name,
        isOverdue: po.jatuhTempo < today,
      })),
      prPending: prPending.map((pr) => ({
        id: pr.id,
        spkNumber: pr.spkNumber,
        productName: pr.productName,
        status: pr.status,
        createdAt: pr.createdAt,
        user: pr.user.name,
        isOverdue: pr.createdAt < sevenDaysAgoForPR,
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Get dashboard error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

