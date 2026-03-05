import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, SpkStatus, FulfillmentStatus } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN]);

    // Ambil SPK yang siap dikirim (READY_TO_SHIP, PARTIAL, atau IN_PROGRESS dengan readyQty > 0)
    // SPK yang statusnya READY_TO_SHIP, PARTIAL, IN_PROGRESS dan SHIPPED (jika masih ada yang siap kirim)
    const [spks, spkReturs]: [any[], any[]] = await Promise.all([
      prisma.spk.findMany({
        where: {
          OR: [
            { warehouseApproved: true },
            { status: { in: [SpkStatus.SHIPPING, SpkStatus.DONE, SpkStatus.PARTIAL] } }
          ],
          status: {
            in: [SpkStatus.READY_TO_SHIP, SpkStatus.PARTIAL, SpkStatus.SHIPPING, SpkStatus.DONE],
          },
        } as any,
        include: {
          lead: true,
          soHeader: { include: { items: true } },
          spkItems: { include: { salesOrder: true } },
          shipping: { include: { driver: { select: { name: true } }, shipping_item: true } },
          invoices: { include: { payments: true } },
          payments: true
        },
        orderBy: { updatedAt: "desc" },
      }),
      (prisma as any).spkRetur.findMany({
        where: {
          status: { in: ["READY_TO_SHIP", "PARTIAL", "SHIPPING", "DONE"] },
        },
        include: {
          parentSpk: {
            include: { lead: true, soHeader: { include: { items: true } }, user: true }
          },
          returnItems: { include: { originalSpkItem: { include: { salesOrder: true } } } },
          productionRequest: true
        },
        orderBy: { updatedAt: "desc" },
      })
    ]);

    // Formatting data untuk frontend
    const formatSpk = async (item: any, isRetur: boolean) => {
      const items = isRetur ? item.returnItems : item.spkItems;
      const lead = isRetur ? item.parentSpk.lead : item.lead;
      const soHeader = isRetur ? item.parentSpk.soHeader : item.soHeader;

      const itemsFormatted = await Promise.all(items.map(async (i: any) => {
        const transitItems = await prisma.shipping_item.findMany({
          where: {
            [isRetur ? "spkReturItemId" : "spkItemId"]: i.id,
            shipping: { waktuSampai: null }
          },
          select: { qty: true }
        });
        const onTruckQty = transitItems.reduce((sum: number, si: any) => sum + si.qty, 0);

        return {
          id: i.id,
          namaBarang: i.namaBarang,
          qty: i.qty,
          readyQty: i.readyQty,
          producedQty: i.producedQty,
          shippedQty: i.shippedQty,
          approvedQty: i.approvedQty,
          onTruckQty,
          satuan: i.satuan,
          fulfillmentMethod: i.fulfillmentMethod,
          fulfillmentStatus: i.fulfillmentStatus,
          salesOrder: i.salesOrder || i.originalSpkItem?.salesOrder ? {
            ...(i.salesOrder || i.originalSpkItem?.salesOrder),
            nama_barang: i.namaBarang
          } : null
        };
      }));

      let shipping = item.shipping;
      if (isRetur && !shipping) {
        // Find latest shipping via return items
        const latestSItem = await prisma.shipping_item.findFirst({
          where: { spkReturItemId: { in: items.map((i: any) => i.id) } },
          include: { shipping: { include: { driver: { select: { name: true } } } } },
          orderBy: { shipping: { tglKirim: "desc" } }
        });
        if (latestSItem) shipping = latestSItem.shipping;
      }

      return {
        id: item.id,
        isRetur,
        spkNumber: item.spkNumber,
        status: item.status,
        updatedAt: item.updatedAt.toISOString(),
        lead,
        soHeader,
        shippingId: shipping?.id || item.shippingId,
        shipping,
        spkItems: itemsFormatted,
        invoices: item.invoices || [],
        payments: item.payments || []
      };
    };

    const result = await Promise.all([
      ...spks.map(s => formatSpk(s, false)),
      ...spkReturs.map(sr => formatSpk(sr, true))
    ]);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Shipping GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data pengiriman" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN]);

    const body = await request.json();
    const { spkIds, driverId, estimasi, catatan, items } = body;

    if (!spkIds || spkIds.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu SPK" }, { status: 400 });
    }

    const shipping = await prisma.$transaction(async (tx) => {
      // 1. Create Shipping Record
      const newShipping = await tx.shipping.create({
        data: {
          driverId,
          estimasi: estimasi ? new Date(estimasi) : null,
          catatan,
          tglKirim: new Date(),
        },
      });

      // 2. Link SPKs to Shipping & Process Items
      for (const spkId of spkIds) {
        const isSpk = await tx.spk.findUnique({ where: { id: spkId } });
        if (isSpk) {
          await tx.spk.update({
            where: { id: spkId },
            data: { shippingId: newShipping.id, status: "SHIPPING" },
          });
        } else {
          await (tx as any).spkRetur.update({
            where: { id: spkId },
            data: { status: "SHIPPING" },
          });
          // SpkRetur might not have a direct shippingId for simplicity or we can add it later if needed
        }
      }

      // 3. Create Shipping Items
      for (const item of items) {
        const isReturItem = item.isRetur;
        await tx.shipping_item.create({
          data: {
            id: crypto.randomUUID(),
            shippingId: newShipping.id,
            spkItemId: !isReturItem ? item.spkItemId : null,
            spkReturItemId: isReturItem ? item.spkItemId : null,
            qty: item.qty,
          },
        });

        if (!isReturItem) {
          const spkItem = await tx.spkItem.findUnique({ where: { id: item.spkItemId } });
          if (spkItem) {
            await tx.spkItem.update({
              where: { id: spkItem.id },
              data: { readyQty: Math.max(0, (spkItem.readyQty || 0) - item.qty) }
            });
          }
        } else {
          const returItem = await (tx as any).spkReturItem.findUnique({ where: { id: item.spkItemId } });
          if (returItem) {
            await (tx as any).spkReturItem.update({
              where: { id: returItem.id },
              data: { readyQty: Math.max(0, (returItem.readyQty || 0) - item.qty) }
            });
          }
        }
      }

      return newShipping;
    });

    // ✅ NOTIFIKASI PENGIRIMAN
    try {
      await prisma.notification.create({
        data: {
          title: "Pengiriman Dimulai",
          message: `Pengiriman baru telah diberangkatkan untuk ${spkIds.length} SPK.`,
          type: "INFO",
          targetUrl: "/shipping",
        },
      });
    } catch (e) {
      console.error("Failed to notify shipping", e);
    }

    return NextResponse.json(shipping);
  } catch (error: any) {
    console.error("Shipping POST error:", error);
    return NextResponse.json({ error: error.message || "Gagal memproses pengiriman" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN]);

    const body = await request.json();
    const { shippingId, penerimaNama, waktuSampai, catatanSelesai, fotoBuktiUrl } = body;

    const updatedShipping = await prisma.$transaction(async (tx) => {
      const ship = await tx.shipping.update({
        where: { id: shippingId },
        data: {
          penerimaNama,
          waktuSampai: waktuSampai ? new Date(waktuSampai) : new Date(),
          catatanSelesai,
          fotoBuktiUrl,
          updatedAt: new Date(),
        },
        include: {
          spks: {
            include: {
              spkItems: true,
              lead: true
            }
          },
          shipping_item: {
            include: {
              spk_item: { include: { spk: { include: { lead: true } } } },
              spk_retur_item: { include: { spkRetur: { include: { parentSpk: { include: { lead: true } } } } } }
            }
          }
        }
      });

      // -----------------------------------------------------------------
      // LOGIKA POTONG STOK FISIK & RECORD TRANSAKSI (KELUAR)
      // -----------------------------------------------------------------
      const { fulfillReservedStock, updateStock } = await import("@/lib/stock");
      
      for (const sItem of ship.shipping_item) {
        const isRetur = !!sItem.spkReturItemId;
        const targetItem = isRetur ? sItem.spk_retur_item : sItem.spk_item;
        if (!targetItem) continue;

        const qty = sItem.qty;
        const spkNumber = isRetur ? (targetItem as any).spkRetur.spkNumber : (targetItem as any).spk.spkNumber;
        const lead = isRetur ? (targetItem as any).spkRetur.parentSpk.lead : (targetItem as any).spk.lead;
        const destination = lead?.nama_toko || "Customer";
        const memo = `Pengiriman Selesai ${isRetur ? "Retur" : "SPK"} ${spkNumber} - ${targetItem.namaBarang} (Penerima: ${penerimaNama})`;

        if (targetItem.itemId) {
           const transaction = await tx.transaction.create({
             data: {
               date: new Date(),
               type: "KELUAR",
               source: targetItem.fulfillmentMethod === "PRODUCTION" ? "PRODUKSI" : "ORDER_CUSTOMER",
               itemId: targetItem.itemId,
               quantity: qty,
               destination,
               spkNumber,
               memo,
               userId: authUser.userId,
             }
           });

           const itemMaster = await tx.item.findUnique({ 
             where: { id: targetItem.itemId },
             select: { currentStock: true, reservedStock: true } 
           });
           
           let effectiveQty = qty;
           if (itemMaster) {
             effectiveQty = Math.min(effectiveQty, itemMaster.currentStock);
             if (targetItem.fulfillmentMethod === "FROM_STOCK") {
               effectiveQty = Math.min(effectiveQty, itemMaster.reservedStock);
             }
           }

           if (effectiveQty > 0) {
             if (targetItem.fulfillmentMethod === "FROM_STOCK") {
               await fulfillReservedStock(targetItem.itemId, effectiveQty, authUser.userId, memo, transaction.id, tx);
             } else {
               await updateStock(targetItem.itemId, effectiveQty, "KELUAR" as any, authUser.userId, memo, transaction.id, tx);
             }
           }
        }

        const finishedShippingItems = await tx.shipping_item.findMany({
          where: {
            [isRetur ? "spkReturItemId" : "spkItemId"]: targetItem.id,
            shipping: { waktuSampai: { not: null } }
          },
          select: { qty: true }
        });
        
        const newShippedQty = finishedShippingItems.reduce((sum, item) => sum + item.qty, 0);
        
        if (!isRetur) {
          // Hitung kumulatif terkirim: Induk + semua Retur-nya
          const returShipped = await tx.shipping_item.aggregate({
            _sum: { qty: true },
            where: { 
              spkReturItemId: { not: null },
              spk_retur_item: { originalSpkItemId: targetItem.id },
              shipping: { waktuSampai: { not: null } }
            }
          });
          const cumulativeShipped = newShippedQty + (returShipped._sum.qty || 0);

          await tx.spkItem.update({
            where: { id: targetItem.id },
            data: {
              shippedQty: newShippedQty,
              fulfillmentStatus: cumulativeShipped >= targetItem.qty ? FulfillmentStatus.FULFILLED : targetItem.fulfillmentStatus
            }
          });
        } else {
          await (tx as any).spkReturItem.update({
            where: { id: targetItem.id },
            data: {
              shippedQty: newShippedQty,
              fulfillmentStatus: newShippedQty >= targetItem.qty ? "FULFILLED" : targetItem.fulfillmentStatus
            }
          });
        }
      }

      // Update semua SPK/Retur terkait menjadi DONE jika semua item sudah terkirim
      // Collect unique SPK IDs and Retur IDs from ship.shipping_item
      const spkIdsToUpdate = new Set<string>();
      const returIdsToUpdate = new Set<string>();

      for (const sItem of ship.shipping_item) {
        if (sItem.spkItemId) {
          const item = await tx.spkItem.findUnique({ where: { id: sItem.spkItemId }, select: { spkId: true } });
          if (item) spkIdsToUpdate.add(item.spkId);
        } else if (sItem.spkReturItemId) {
          const item = await (tx as any).spkReturItem.findUnique({ 
            where: { id: sItem.spkReturItemId }, 
            select: { spkRetur: { select: { id: true, parentSpkId: true } } } 
          });
          if (item?.spkRetur) {
            returIdsToUpdate.add(item.spkRetur.id);
            spkIdsToUpdate.add(item.spkRetur.parentSpkId); // Re-check parent!
          }
        }
      }

      for (const id of spkIdsToUpdate) {
        const freshItems = await tx.spkItem.findMany({ where: { spkId: id } });
        
        // Cek kumulatif: Gabungkan shippedQty dari SPK Induk + ShippedQty di semua SpkRetur yang merujuk ke item ini
        const allShipped = await Promise.all(freshItems.map(async (item) => {
          const returShipped = await (tx as any).spkReturItem.aggregate({
            _sum: { shippedQty: true },
            where: { originalSpkItemId: item.id }
          });
          const totalShipped = (item.shippedQty || 0) + (returShipped._sum.shippedQty || 0);
          return totalShipped >= item.qty;
        }));

        const isFullyDone = allShipped.every(res => res === true);
        await tx.spk.update({
          where: { id },
          data: { status: isFullyDone ? SpkStatus.DONE : SpkStatus.PARTIAL }
        });
      }

      for (const id of returIdsToUpdate) {
        const freshItems = await (tx as any).spkReturItem.findMany({ where: { spkReturId: id } });
        const allShipped = freshItems.every((item: any) => (item.shippedQty || 0) >= item.qty);
        await (tx as any).spkRetur.update({
          where: { id },
          data: { status: allShipped ? "DONE" : "PARTIAL" }
        });
      }

      return ship;
    });

    return NextResponse.json(updatedShipping);
  } catch (error: any) {
    console.error("Shipping PATCH error:", error);
    return NextResponse.json({ error: error.message || "Gagal menyelesaikan pengiriman" }, { status: 500 });
  }
}
