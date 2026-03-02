import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, TransactionType } from '@/lib/constants'
import { updateStock } from '@/lib/stock'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.ADMIN_GUDANG])
    
    const { id } = await params;
    const body = await request.json();
    const { receivedAt, suratJalanUrl, customJatuhTempo } = body;

    if (!receivedAt || !suratJalanUrl) {
      return NextResponse.json(
        { error: 'Data pelengkap (Tanggal, Surat Jalan) harus diisi' },
        { status: 400 }
      )
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    if (purchaseOrder.isReceived) {
      return NextResponse.json(
        { error: 'Purchase Order sudah dikonfirmasi sampai' },
        { status: 400 }
      )
    }

    // Prepare update data
    const arrivalDate = new Date(receivedAt);
    let newJatuhTempo = purchaseOrder.jatuhTempo;

    // Calculate Jatuh Tempo if it depends on arrival
    if (purchaseOrder.paymentMethod === 'INSTALLMENT') {
      if (purchaseOrder.paymentTerm === 'CUSTOM' && customJatuhTempo) {
        newJatuhTempo = new Date(customJatuhTempo);
      } else {
        const days = parseInt(purchaseOrder.paymentTerm || '7');
        if (!isNaN(days)) {
          newJatuhTempo = new Date(arrivalDate);
          newJatuhTempo.setDate(newJatuhTempo.getDate() + days);
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update PO status and receipt data
      const updatedPO = await tx.purchaseOrder.update({
        where: { id },
        data: {
          isReceived: true,
          receivedAt: arrivalDate,
          suratJalanUrl,
          jatuhTempo: newJatuhTempo,
          status: 'RECEIVED'
        },
      });

      // 2. Update stock for each item
      for (const item of purchaseOrder.items) {
        if (item.itemId) {
          try {
            console.log(`Updating stock for item: ${item.itemId}, qty: ${item.qty}`);
            await updateStock(
              item.itemId,
              item.qty,
              TransactionType.MASUK,
              authUser.userId,
              `Penerimaan barang PO #${purchaseOrder.nomorPO}`,
              id,
              tx
            );
          } catch (itemErr: any) {
            console.error(`Error updating stock for item ${item.itemId}:`, itemErr);
            throw new Error(`Gagal update stok barang: ${itemErr.message}`);
          }
        } else {
            console.warn(`Item ${item.id} has no itemId mapped to inventory!`);
        }
      }

      // 3. Sync readyQty to associated SPK items if this PO is for an SPK
      if (purchaseOrder.spkId) {
        const spk = await tx.spk.findUnique({
          where: { id: purchaseOrder.spkId },
          include: { spkItems: true }
        });

        if (spk) {
          for (const spkItem of spk.spkItems) {
            // Find corresponding PO item by name and unit (basic matching since PO items might lack direct relations)
            const matchingPoItem = purchaseOrder.items.find(poi => 
              poi.namaBarang.toLowerCase().trim() === spkItem.namaBarang.toLowerCase().trim()
            );

            if (matchingPoItem) {
              await tx.spkItem.update({
                where: { id: spkItem.id },
                data: {
                  readyQty: { increment: matchingPoItem.qty },
                }
              });

              // Also create progress history indicating goods receipt
              await tx.spkItemProgress.create({
                data: {
                  spkItemId: spkItem.id,
                  stage: "Barang Trading Diterima (PO)",
                  resultQty: matchingPoItem.qty,
                  operatorId: authUser.userId,
                }
              });
            }
          }
        }
      }

      return updatedPO;
    });

    return NextResponse.json({ 
      message: 'Kedatangan barang berhasil dikonfirmasi',
      purchaseOrder: result 
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Receive purchase order error:', error)
    return NextResponse.json(
      { error: `Terjadi kesalahan: ${error.message}`, stack: error.stack },
      { status: 500 }
    )
  }
}
