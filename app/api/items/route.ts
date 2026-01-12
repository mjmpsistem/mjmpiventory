import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG, UserRole.STAFF_GUDANG])
    
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (category) {
      where.category = category
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        itemType: true,
        unit: true,
        transactions: {
          where: {
            price: { not: null },
          },
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            price: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ items })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Get items error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

// Helper function to generate next item code
async function generateNextItemCode(category: string): Promise<string> {
  const prefix = category === 'BAHAN_BAKU' ? 'BB' : 'BJ'
  
  // Find the highest existing code number for this category
  const existingItems = await prisma.item.findMany({
    where: {
      code: {
        startsWith: prefix,
      },
    },
    select: {
      code: true,
    },
    orderBy: {
      code: 'desc',
    },
  })

  let nextNumber = 1
  
  if (existingItems.length > 0) {
    // Extract numbers from existing codes (e.g., "BB001" -> 1, "BB123" -> 123)
    const numbers = existingItems
      .map(item => {
        const match = item.code.match(/\d+$/)
        return match ? parseInt(match[0], 10) : 0
      })
      .filter(num => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }

  // Format with leading zeros (e.g., 1 -> "001", 123 -> "123")
  const formattedNumber = nextNumber.toString().padStart(3, '0')
  return `${prefix}${formattedNumber}`
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])
    
    const body = await request.json()
    const {
      code,
      name,
      itemTypeId,
      category,
      productGroup,
      unitId,
      stockMinimum,
      vendor,
      hargaSatuan,
      ukuran,
      kuantitas,
      isTrading,
    } = body

    if (!name || !itemTypeId || !category || !unitId) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    // Auto-generate code if not provided
    const itemCode = code || await generateNextItemCode(category)

    const itemData: any = {
      code: itemCode,
      name,
      itemTypeId,
      category,
      unitId,
      stockMinimum: stockMinimum || 0,
      currentStock: 0,
      isTrading: isTrading || false,
    }

    // Set productGroup jika ada
    if (productGroup) {
      itemData.productGroup = productGroup
    }

    // Field khusus untuk Bahan Baku
    if (category === 'BAHAN_BAKU') {
      if (vendor) itemData.vendor = vendor
      if (hargaSatuan !== undefined) itemData.hargaSatuan = hargaSatuan
    }

    // Field khusus untuk Barang Jadi
    if (category === 'BARANG_JADI') {
      if (ukuran) itemData.ukuran = ukuran
      if (kuantitas !== undefined) itemData.kuantitas = kuantitas
      if (isTrading) itemData.isTrading = true
    }

    const item = await prisma.item.create({
      data: itemData,
      include: {
        itemType: true,
        unit: true,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Kode barang sudah ada' },
        { status: 400 }
      )
    }
    console.error('Create item error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

