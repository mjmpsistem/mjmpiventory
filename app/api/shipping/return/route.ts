import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, TransactionType, TransactionSource } from "@/lib/constants";
import { releaseReservedStock, updateStock } from "@/lib/stock";

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const body = await request.json();
    const { shippingItemId, qty, reason, notes } = body;

    if (!shippingItemId || !qty || qty <= 0 || !reason) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Shipping Item and related SpkItem
      const sItem = await tx.shipping_item.findUnique({
        where: { id: shippingItemId },
        include: {
          spk_item: {
            include: {
              spk: true,
              item: true,
            },
          },
        },
      });

      if (!sItem) {
        throw new Error("Item pengiriman tidak ditemukan");
      }
      if (sItem.qty < qty) {
        throw new Error("Jumlah retur melebihi jumlah di pengiriman");
      }

      const spkItem = sItem.spk_item;
      const relatedSpk = spkItem.spk;
      const itemId = spkItem.itemId;

      // 2. Create product_return record
      const returnItem = await (tx as any).productReturn.create({
        data: {
          shippingItemId,
          spkItemId: spkItem.id,
          qty,
          reason,
          notes,
        },
      });

      // 3. Update shipping_item.qty and spkItem.approvedQty (Only decrement if not REPACK)
      await tx.shipping_item.update({
        where: { id: shippingItemId },
        data: { qty: { decrement: qty } },
      });

      if (reason !== "REPACK") {
        await tx.spkItem.update({
          where: { id: spkItem.id },
          data: { approvedQty: { decrement: qty } },
        });
      }

      // 4. Logic based on reason and fulfillment method
      const memo = `Retur (${reason}) SPK ${relatedSpk.spkNumber} - ${spkItem.namaBarang}: ${notes || ""}`;

      if (reason === "REPACK") {
        await tx.spkItem.update({
          where: { id: spkItem.id },
          data: { 
            readyQty: { increment: qty },
            productionStatus: "SIAP_KIRIM"
          },
        });
      } else if (reason === "RECYCLE") {
        if (itemId) {
          if (spkItem.fulfillmentMethod === "FROM_STOCK") {
            await releaseReservedStock(itemId, qty, authUser.userId, memo, tx);
            await updateStock(itemId, qty, TransactionType.KELUAR as any, authUser.userId, memo, undefined, tx);
            
            // ✅ SINKRONISASI SISTEM A: Tandai bahwa item ini perlu pengajuan ulang
            await tx.spkItem.update({
              where: { id: spkItem.id },
              data: { 
                productionStatus: "REPLACEMENT_NEEDED",
                itemStatus: "QUEUE", // Kembalikan ke antrean agar terlihat
                recycledQty: { increment: qty }
              },
            });
          } else {
            // PRODUCTION: decrement producedQty because the produced item is now waste
            // AND clear productionRequestId so it can be requested again
            await tx.spkItem.update({
              where: { id: spkItem.id },
              data: { 
                producedQty: { decrement: qty },
                productionRequestId: null, // Trigger appearance in "Production Needed"
                productionStatus: "REPLACEMENT",
                recycledQty: { increment: qty }
              },
            });
            await updateStock(itemId, qty, TransactionType.KELUAR as any, authUser.userId, memo, undefined, tx);
          }
          await tx.wasteStock.create({
            data: {
              materialId: itemId,
              spkId: relatedSpk.id,
              quantity: qty,
              notes: memo,
            },
          });
        }
      }

      // 4.1 Sync Fulfillment Status for the returned item
      // REPACK: stay RESERVED/READY because approval is kept, and it's already in warehouse
      // RECYCLE: return to PENDING (if stock) so it can be re-allocated, or IN_PROGRESS (if production)
      if (spkItem.fulfillmentMethod === "FROM_STOCK") {
        await tx.spkItem.update({
          where: { id: spkItem.id },
          data: { 
            fulfillmentStatus: reason === "RECYCLE" ? "PENDING" : "RESERVED",
            itemStatus: reason === "RECYCLE" ? "QUEUE" : "READY"
          }
        });
      } else if (spkItem.fulfillmentMethod === "PRODUCTION") {
        const updatedItemInDb = await tx.spkItem.findUnique({ where: { id: spkItem.id } });
        // If it's RECYCLE, it definitely needs more production
        if (reason === "RECYCLE" || (updatedItemInDb && (updatedItemInDb.producedQty || 0) < updatedItemInDb.qty - 0.01)) {
          await tx.spkItem.update({
            where: { id: spkItem.id },
            data: { 
              fulfillmentStatus: "IN_PROGRESS",
              itemStatus: "PRODUKSI"
            }
          });
        }
      }

      // 4.2 Sync Shipped Qty (Aggregate calculation)
      // Since shipping_item.qty was decremented above, we need to refresh the parent spkItem.shippedQty
      const finishedShippingItems = await tx.shipping_item.findMany({
        where: {
          spkItemId: spkItem.id,
          shipping: {
            waktuSampai: { not: null }
          }
        },
        select: { qty: true }
      });
      const aggregateShipped = finishedShippingItems.reduce((sum, item) => sum + item.qty, 0);
      await tx.spkItem.update({
        where: { id: spkItem.id },
        data: { shippedQty: aggregateShipped }
      });

      // 5. Recalculate SPK Status
      const allItems = await tx.spkItem.findMany({
        where: { spkId: relatedSpk.id },
        include: { shipping_item: { include: { shipping: true } } }
      });

      let totalOnTruck = 0;
      let totalShipped = 0;
      let totalQty = 0;
      let totalApproved = 0;

      for (const item of allItems) {
        totalQty += item.qty;
        totalApproved += (item.approvedQty || 0);
        totalShipped += (item.shippedQty || 0);
        
        const onTruck = item.shipping_item.reduce((sum, si) => {
          if (!si.shipping.waktuSampai) return sum + si.qty;
          return sum;
        }, 0);
        totalOnTruck += onTruck;
      }

      let newStatus = relatedSpk.status;
      if (totalOnTruck > 0) {
        newStatus = "SHIPPING";
      } else {
        if (totalShipped >= totalQty - 0.01) {
          newStatus = "DONE";
        } else if (totalShipped > 0) {
          newStatus = "PARTIAL";
        } else {
          // Item returned, no shipped quantity yet.
          // Determine if it should be IN_PROGRESS or READY_TO_SHIP
          const productionItems = allItems.filter(i => i.fulfillmentMethod === "PRODUCTION");
          const hasProductionStarted = productionItems.some(i => (i.producedQty || 0) > 0);
          const allProductionDone = productionItems.every(i => (i.producedQty || 0) >= i.qty - 0.01);

          if (productionItems.length > 0 && (!hasProductionStarted || !allProductionDone)) {
            newStatus = "IN_PROGRESS";
          } else {
            // Either all done production, or only stock items.
            // Move to READY_TO_SHIP since there is readyQty (from the return itself)
            newStatus = "READY_TO_SHIP";
          }
        }
      }

      await tx.spk.update({
        where: { id: relatedSpk.id },
        data: { 
          status: newStatus as any,
          // Ensure it stays "pushed" to the production/warehouse floor
          inventoryApproved: true,
          inventoryApprovedAt: relatedSpk.inventoryApprovedAt || new Date(),
          warehouseApproved: totalApproved >= totalQty - 0.01
        }
      });

      return returnItem;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Return POST error details:", error);
    return NextResponse.json({ error: error.message || "Gagal memproses retur" }, { status: 500 });
  }
}
