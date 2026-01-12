import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, ProductionRequestStatus } from '@/lib/constants'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])
    
    const { id } = await params;
    
    const productionRequest = await prisma.productionRequest.findUnique({
      where: { id },
    })

    if (!productionRequest) {
      return NextResponse.json(
        { error: 'Permintaan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (productionRequest.status !== ProductionRequestStatus.PENDING) {
      return NextResponse.json(
        { error: 'Status permintaan tidak valid' },
        { status: 400 }
      )
    }

    await prisma.productionRequest.update({
      where: { id },
      data: { status: ProductionRequestStatus.REJECTED },
    })

    return NextResponse.json({ message: 'Permintaan ditolak' })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Reject production request error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}


