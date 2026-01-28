import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, TransactionType, TransactionSource } from '@/lib/constants'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])
    
    const { id } = await params;
    
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        spk: {
          include: {
            spkItems: {
              where: {
                fulfillmentMethod: 'TRADING',
              },
            },
          },
        },
      },
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    // Untuk TRADING, langsung approve tanpa validasi inventory
    // Barang dari vendor akan masuk nanti, dan ketika approve di approval barang jadi akan dicatat ke barang keluar
    // Update status menjadi APPROVED
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    })

    return NextResponse.json({ 
      message: 'Purchase Order berhasil di-approve',
      purchaseOrder: updatedPO 
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Approve purchase order error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
