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
    }

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

