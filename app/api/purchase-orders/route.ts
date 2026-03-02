import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG, UserRole.STAFF_GUDANG])
    
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (startDate || endDate) {
      where.tanggal = {}
      if (startDate) {
        where.tanggal.gte = new Date(startDate)
      }
      if (endDate) {
        where.tanggal.lte = new Date(endDate)
      }
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
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
      orderBy: {
        tanggal: 'desc',
      },
    })

    return NextResponse.json({ purchaseOrders })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Get purchase orders error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])
    
    const body = await request.json()
    const { kepada, nomorPO, tanggal, jatuhTempo, keteranganTambahan, hormatKami, items, spkId, status } = body
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])

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

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (parseFloat(item.subTotal) || 0), 0);

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        kepada,
        nomorPO,
        tanggal: new Date(tanggal),
        jatuhTempo: new Date(jatuhTempo),
        keteranganTambahan: keteranganTambahan || null,
        hormatKami: hormatKami || null,
        userId: authUser.userId,
        spkId: spkId || null,
        status: status || "PENDING",
        paymentMethod: body.paymentMethod || "CASH",
        paymentTerm: body.paymentTerm || "7",
        totalAmount,
        paidAmount: 0,
        paymentStatus: "UNPAID",
        isReceived: false,
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
        items: true,
      },
    })

    // ✅ CREATE NOTIFICATION
    try {
      console.log(`[NOTIFICATION_LOG] Creating notification for Purchase Order: #${nomorPO}`);
      const poNotification = await prisma.notification.create({
        data: {
          title: "Purchase Order Baru",
          message: `PO #${nomorPO} untuk ${kepada}`,
          type: "INFO",
          targetUrl: "/transaksi/purchase-order",
        },
      });
      console.log(`[NOTIFICATION_LOG] Notification created successfully with ID: ${poNotification.id}`);
    } catch (notifyError: any) {
      console.error("[NOTIFICATION_LOG] Failed to create notification for PO:", notifyError.message || notifyError);
    }

    return NextResponse.json({ purchaseOrder }, { status: 201 })
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
    console.error('Create purchase order error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
