import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG, UserRole.STAFF_GUDANG])
    
    const { id } = await params;
    
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        itemType: true,
        unit: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Get item error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])
    
    const { id } = await params;
    const body = await request.json()
    const {
      name,
      itemTypeId,
      category,
      productGroup,
      unitId,
      stockMinimum,
      isActive,
      vendor,
      hargaSatuan,
      ukuran,
      warna,
      ketebalan,
      spesifikasi_tambahan,
      kuantitas,
      isTrading,
    } = body

    // Get existing item to preserve code
    const existingItem = await prisma.item.findUnique({
      where: { id },
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item tidak ditemukan' },
        { status: 404 }
      )
    }

    const itemData: any = {
      name,
      itemTypeId,
      category,
      unitId,
      stockMinimum: stockMinimum !== undefined ? stockMinimum : existingItem.stockMinimum,
      isActive: isActive !== undefined ? isActive : existingItem.isActive,
      isTrading: isTrading !== undefined ? isTrading : existingItem.isTrading,
    }

    // Set productGroup jika ada
    if (productGroup !== undefined) {
      itemData.productGroup = productGroup || null
    }

    // Field khusus untuk Bahan Baku
    if (category === 'BAHAN_BAKU') {
      itemData.vendor = vendor !== undefined ? (vendor || null) : existingItem.vendor
      itemData.hargaSatuan = hargaSatuan !== undefined ? (hargaSatuan || null) : existingItem.hargaSatuan
      // Reset field barang jadi
      itemData.ukuran = null
      itemData.kuantitas = null
    }

    // Field khusus untuk Barang Jadi
    if (category === 'BARANG_JADI') {
      itemData.ukuran = ukuran !== undefined ? (ukuran || null) : existingItem.ukuran
      itemData.warna = warna !== undefined ? (warna || null) : existingItem.warna
      itemData.ketebalan = ketebalan !== undefined ? (ketebalan || null) : existingItem.ketebalan
      itemData.spesifikasi_tambahan = spesifikasi_tambahan !== undefined ? (spesifikasi_tambahan || null) : existingItem.spesifikasi_tambahan
      itemData.kuantitas = kuantitas !== undefined ? (kuantitas || null) : existingItem.kuantitas
      // Reset field bahan baku
      itemData.vendor = null
      itemData.hargaSatuan = null
    }

    const item = await prisma.item.update({
      where: { id },
      data: itemData,
      include: {
        itemType: true,
        unit: true,
      },
    })

    return NextResponse.json({ item })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Update item error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

