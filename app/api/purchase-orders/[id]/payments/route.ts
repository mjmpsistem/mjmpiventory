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

    const payments = await prisma.purchaseOrderPayment.findMany({
      where: { purchaseOrderId: id },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])
    
    const { id } = await params;
    const { amount, paymentDate, method, notes } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Jumlah pembayaran tidak valid' }, { status: 400 });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id }
    });

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'PO tidak ditemukan' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.purchaseOrderPayment.create({
        data: {
          purchaseOrderId: id,
          amount: parseFloat(amount),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          method: method || 'TRANSFER',
          notes: notes || null,
          userId: authUser.userId
        }
      });

      // 2. Fetch updated total paid
      const allPayments = await tx.purchaseOrderPayment.aggregate({
        where: { purchaseOrderId: id },
        _sum: { amount: true }
      });

      const totalPaid = allPayments._sum.amount || 0;
      
      // 3. Update PO summary
      let paymentStatus = 'PARTIAL';
      if (totalPaid >= purchaseOrder.totalAmount) {
        paymentStatus = 'PAID';
      } else if (totalPaid <= 0) {
        paymentStatus = 'UNPAID';
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          paidAmount: totalPaid,
          paymentStatus: paymentStatus
        }
      });

      return payment;
    });

    return NextResponse.json({ message: 'Pembayaran berhasil dicatat', payment: result });
  } catch (error: any) {
    console.error('Record PO payment error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
