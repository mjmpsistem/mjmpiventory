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
    
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        spk: {
          select: {
            id: true,
            spkNumber: true,
          },
        },
        items: true,
      },
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ purchaseOrder })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Get purchase order error:', error)
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
    const { kepada, nomorPO, tanggal, jatuhTempo, keteranganTambahan, hormatKami, items, spkId, status } = body
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])

    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
    })

    if (!existingPO) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!kepada || !nomorPO || !tanggal || !jatuhTempo || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.namaBarang || !item.qty || !item.satuan || item.subTotal === undefined) {
        return NextResponse.json(
          { error: 'Data item tidak lengkap' },
          { status: 400 }
        )
      }
    }

    // Delete existing items and create new ones
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id },
    })

    // Update purchase order
    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        kepada,
        nomorPO,
        tanggal: new Date(tanggal),
        jatuhTempo: new Date(jatuhTempo),
        keteranganTambahan: keteranganTambahan || null,
        hormatKami: hormatKami || null,
        spkId: spkId || null,
        status: status !== undefined ? status : undefined,
        items: {
          create: items.map((item: any) => ({
            namaBarang: item.namaBarang,
            ukuran: item.ukuran || null,
            qty: parseFloat(item.qty),
            satuan: item.satuan,
            noticeMerkJenis: item.noticeMerkJenis || null,
            subTotal: parseFloat(item.subTotal),
          })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        spk: {
          select: {
            id: true,
            spkNumber: true,
          },
        },
        items: true,
      },
    })

    return NextResponse.json({ purchaseOrder })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Nomor PO sudah ada' },
        { status: 400 }
      )
    }
    console.error('Update purchase order error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])
    
    const { id } = await params;
    
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Purchase Order berhasil dihapus' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Delete purchase order error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
