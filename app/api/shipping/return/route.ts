import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, TransactionType, TransactionSource } from "@/lib/constants";
import { releaseReservedStock, updateStock } from "@/lib/stock";

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN, UserRole.ADMIN_GUDANG, UserRole.STAFF_GUDANG]);

    const body = await request.json();
    const { shippingItemId, qty, reason, notes } = body;

    if (!shippingItemId || !qty || qty <= 0 || !reason) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Shipping Item and related SpkItem or SpkReturItem
      const sItem = await tx.shipping_item.findUnique({
        where: { id: shippingItemId },
        include: {
          spk_item: { include: { spk: true, item: true } },
          spk_retur_item: { include: { spkRetur: { include: { parentSpk: true } }, item: true } }
        },
      });

      if (!sItem) {
        throw new Error("Item pengiriman tidak ditemukan");
      }
      if (sItem.qty < qty) {
        throw new Error("Jumlah retur melebihi jumlah di pengiriman");
      }

      const isReturItem = !!sItem.spkReturItemId;
      const targetItem = isReturItem ? sItem.spk_retur_item : sItem.spk_item;
      if (!targetItem) throw new Error("Item SPK tidak ditemukan");

      const parentSpkId = isReturItem ? (targetItem as any).spkRetur.id : (targetItem as any).spk.id;
      const spkNumber = isReturItem ? (targetItem as any).spkRetur.spkNumber : (targetItem as any).spk.spkNumber;
      const itemId = targetItem.itemId;

      // 2. Create product_return record
      const returnItem = await (tx as any).productReturn.create({
        data: {
          shippingItemId,
          spkItemId: !isReturItem ? targetItem.id : null,
          spkReturItemId: isReturItem ? targetItem.id : null,
          qty,
          reason,
          notes,
        },
      });

      // 3. Update shipping_item.qty and item approvedQty (Only decrement if not REPACK)
      await tx.shipping_item.update({
        where: { id: shippingItemId },
        data: { qty: { decrement: qty } },
      });

      if (reason !== "REPACK") {
        if (!isReturItem) {
          await tx.spkItem.update({
            where: { id: targetItem.id },
            data: { approvedQty: { decrement: qty } },
          });
        } else {
          await (tx as any).spkReturItem.update({
            where: { id: targetItem.id },
            data: { approvedQty: { decrement: qty } },
          });
        }
      }

      // 4. Logic based on reason and fulfillment method
      const memo = `Retur (${reason}) ${isReturItem ? "Retur SPK" : "SPK"} ${spkNumber} - ${targetItem.namaBarang}: ${notes || ""}`;

      if (reason === "REPACK") {
        const updateData = { 
          readyQty: { increment: qty },
          [isReturItem ? "itemStatus" : "productionStatus"]: isReturItem ? "READY" : "SIAP_KIRIM"
        };
        if (!isReturItem) {
          await tx.spkItem.update({ where: { id: targetItem.id }, data: updateData as any });
        } else {
          await (tx as any).spkReturItem.update({ where: { id: targetItem.id }, data: updateData as any });
        }
      } else if (reason === "RECYCLE") {
        if (itemId) {
          if (targetItem.fulfillmentMethod === "FROM_STOCK") {
            await releaseReservedStock(itemId, qty, authUser.userId, memo, tx);
            await updateStock(itemId, qty, TransactionType.KELUAR as any, authUser.userId, memo, undefined, tx);
            
            const updateData = { 
              [isReturItem ? "itemStatus" : "productionStatus"]: isReturItem ? "QUEUE" : "REPLACEMENT_NEEDED",
              [isReturItem ? "fulfillmentStatus" : "itemStatus"]: isReturItem ? "PENDING" : "QUEUE",
              recycledQty: { increment: qty }
            };
            if (!isReturItem) {
              await tx.spkItem.update({ where: { id: targetItem.id }, data: updateData as any });
            } else {
              await (tx as any).spkReturItem.update({ where: { id: targetItem.id }, data: updateData as any });
            }
          } else {
            // PRODUCTION
            const updateData = { 
              producedQty: { decrement: qty },
              productionRequestId: null,
              [isReturItem ? "itemStatus" : "productionStatus"]: isReturItem ? "QUEUE" : "REPLACEMENT",
              recycledQty: { increment: qty }
            };
            if (!isReturItem) {
              await tx.spkItem.update({ where: { id: targetItem.id }, data: updateData as any });
            } else {
              await (tx as any).spkReturItem.update({ where: { id: targetItem.id }, data: updateData as any });
            }
            await updateStock(itemId, qty, TransactionType.KELUAR as any, authUser.userId, memo, undefined, tx);
          }
          await tx.wasteStock.create({
            data: {
              materialId: itemId,
              spkId: !isReturItem ? parentSpkId : undefined,
              // SpkRetur relation to WasteStock might not exist in schema, but we can log spkNumber in notes or use parent
              notes: memo + ` (Original: ${spkNumber})`,
              quantity: qty,
            },
          });
        }
      }

      // 4.1 Sync Fulfillment Status
      if (targetItem.fulfillmentMethod === "FROM_STOCK") {
        const updateData = {
          fulfillmentStatus: reason === "RECYCLE" ? "PENDING" : "RESERVED",
          itemStatus: reason === "RECYCLE" ? "QUEUE" : "READY"
        };
        if (!isReturItem) {
          await tx.spkItem.update({ where: { id: targetItem.id }, data: updateData as any });
        } else {
          await (tx as any).spkReturItem.update({ where: { id: targetItem.id }, data: updateData as any });
        }
      } else if (targetItem.fulfillmentMethod === "PRODUCTION") {
        const freshItem = !isReturItem 
          ? await tx.spkItem.findUnique({ where: { id: targetItem.id } })
          : await (tx as any).spkReturItem.findUnique({ where: { id: targetItem.id } });
        
        if (reason === "RECYCLE" || (freshItem && (freshItem.producedQty || 0) < freshItem.qty - 0.01)) {
          const updateData = { 
            fulfillmentStatus: !isReturItem ? "IN_PROGRESS" : "PENDING",
            itemStatus: isReturItem ? "PRODUKSI" : "PRODUKSI" // ItemStatus names might differ slightly
          };
          if (!isReturItem) {
            await tx.spkItem.update({ where: { id: targetItem.id }, data: updateData as any });
          } else {
            // Adjust itemStatus for SpkReturItem if needed
            await (tx as any).spkReturItem.update({ where: { id: targetItem.id }, data: { fulfillmentStatus: "PENDING", itemStatus: "QUEUE" } });
          }
        }
      }

      // 4.2 Sync Shipped Qty
      const finishedShippingItems = await tx.shipping_item.findMany({
        where: {
          [isReturItem ? "spkReturItemId" : "spkItemId"]: targetItem.id,
          shipping: { waktuSampai: { not: null } }
        },
        select: { qty: true }
      });
      const aggregateShipped = finishedShippingItems.reduce((sum, item) => sum + item.qty, 0);
      if (!isReturItem) {
        await tx.spkItem.update({ where: { id: targetItem.id }, data: { shippedQty: aggregateShipped } });
      } else {
        await (tx as any).spkReturItem.update({ where: { id: targetItem.id }, data: { shippedQty: aggregateShipped } });
      }

      // 5. Recalculate Parent Status
      if (!isReturItem) {
        const allItems = await tx.spkItem.findMany({
          where: { spkId: parentSpkId },
          include: { shipping_item: { include: { shipping: true } } }
        });

        let totalOnTruck = 0, totalCumulativeShipped = 0, totalQty = 0, totalApproved = 0;
        for (const item of allItems) {
          totalQty += item.qty;
          totalApproved += (item.approvedQty || 0);
          
          // Hitung kumulatif: Induk + semua Retur-nya
          const returShipped = await tx.shipping_item.aggregate({
            _sum: { qty: true },
            where: { 
              spkReturItemId: { not: null },
              spk_retur_item: { originalSpkItemId: item.id },
              shipping: { waktuSampai: { not: null } }
            }
          });
          const itemCumulativeShipped = (item.shippedQty || 0) + (returShipped._sum.qty || 0);
          totalCumulativeShipped += itemCumulativeShipped;

          totalOnTruck += item.shipping_item.reduce((sum, si) => si.shipping.waktuSampai ? sum : sum + si.qty, 0);
        }

        let newStatus = totalOnTruck > 0 ? "SHIPPING" : (totalCumulativeShipped >= totalQty - 0.01 ? "DONE" : (totalCumulativeShipped > 0 ? "PARTIAL" : "IN_PROGRESS"));
        if (newStatus === "IN_PROGRESS") {
          const productionItems = allItems.filter(i => i.fulfillmentMethod === "PRODUCTION");
          const allProductionDone = productionItems.every(i => (i.producedQty || 0) >= i.qty - 0.01);
          if (productionItems.length === 0 || allProductionDone) newStatus = "READY_TO_SHIP";
        }

        await tx.spk.update({
          where: { id: parentSpkId },
          data: { 
            status: newStatus as any,
            warehouseApproved: totalApproved >= totalQty - 0.01
          }
        });
      } else {
        const allItems = await (tx as any).spkReturItem.findMany({
          where: { spkReturId: parentSpkId },
          include: { shipping_item: { include: { shipping: true } } }
        });

        let totalOnTruck = 0, totalShipped = 0, totalQty = 0;
        for (const item of allItems) {
          totalQty += item.qty;
          totalShipped += (item.shippedQty || 0);
          totalOnTruck += item.shipping_item.reduce((sum: number, si: any) => si.shipping.waktuSampai ? sum : sum + si.qty, 0);
        }

        let newStatus = totalOnTruck > 0 ? "SHIPPING" : (totalShipped >= totalQty - 0.01 ? "DONE" : (totalShipped > 0 ? "PARTIAL" : "READY_TO_SHIP"));
        await (tx as any).spkRetur.update({
          where: { id: parentSpkId },
          data: { status: newStatus }
        });
      }

      // ✅ NOTIFIKASI RETUR
      try {
        await tx.notification.create({
          data: {
            title: "Barang Retur",
            message: `Retur ${qty} unit ${targetItem.namaBarang} (${isReturItem ? "Retur " : ""}SPK #${spkNumber})`,
            type: "WARNING",
            targetUrl: "/shipping",
          },
        });
      } catch (e) {
        console.error("Failed to notify retur", e);
      }

      return returnItem;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Return POST error details:", error);
    return NextResponse.json({ error: error.message || "Gagal memproses retur" }, { status: 500 });
  }
}
