import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { UserRole, SpkStatus, FulfillmentStatus } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    // Ambil SPK yang siap dikirim (READY_TO_SHIP, PARTIAL, atau IN_PROGRESS dengan readyQty > 0)
    // SPK yang statusnya READY_TO_SHIP, PARTIAL, IN_PROGRESS dan SHIPPED (jika masih ada yang siap kirim)
    const spks: any[] = await prisma.spk.findMany({
      where: {
        OR: [
          { warehouseApproved: true },
          { status: { in: [SpkStatus.SHIPPING, SpkStatus.DONE] } }
        ],
        status: {
          in: [SpkStatus.READY_TO_SHIP, SpkStatus.PARTIAL, SpkStatus.SHIPPING, SpkStatus.DONE],
        },
      } as any,
      include: {
        lead: true,
        soHeader: {
          include: {
            items: true
          }
        },
        spkItems: {
          include: {
            salesOrder: true
          }
        },
        shipping: {
          include: {
            driver: {
              select: {
                name: true
              }
            },
            shipping_item: true
          }
        },
        invoices: {
          include: {
            payments: true
          }
        },
        payments: true
      },
      orderBy: { updatedAt: "desc" },
    });

    // Formatting data untuk frontend dengan informasi Transit
    const result = await Promise.all(spks.map(async (spk) => {
      const spkItemsFormatted = await Promise.all(spk.spkItems.map(async (item: any) => {
        // Hitung kuantitas yang sedang di jalan (transit)
        const transitItems = await prisma.shipping_item.findMany({
          where: {
            spkItemId: item.id,
            shipping: {
              waktuSampai: null // Belum sampai
            }
          },
          select: { qty: true }
        });
        const onTruckQty = transitItems.reduce((sum: number, si: any) => sum + si.qty, 0);

        return {
          id: item.id,
          namaBarang: item.namaBarang,
          qty: item.qty,
          readyQty: item.readyQty,
          producedQty: item.producedQty,
          shippedQty: item.shippedQty,
          approvedQty: item.approvedQty,
          onTruckQty,
          satuan: item.satuan,
          fulfillmentMethod: item.fulfillmentMethod,
          fulfillmentStatus: item.fulfillmentStatus,
          salesOrder: item.salesOrder ? {
            kode_barang: item.salesOrder.kode_barang,
            ukuran_barang: item.salesOrder.ukuran_barang,
            warna_barang: item.salesOrder.warna_barang,
            ketebalan_barang: item.salesOrder.ketebalan_barang,
            quantity: item.salesOrder.quantity,
            satuan: item.salesOrder.satuan,
            pcs_per_pack: item.salesOrder.pcs_per_pack,
            spesifikasi_tambahan: item.salesOrder.spesifikasi_tambahan,
            catatan: item.salesOrder.catatan,
            harga_satuan: item.salesOrder.harga_satuan
          } : null
        };
      }));

      return {
        id: spk.id,
        spkNumber: spk.spkNumber,
        status: spk.status,
        updatedAt: spk.updatedAt.toISOString(),
        lead: spk.lead,
        soHeader: spk.soHeader,
        shippingId: spk.shippingId,
        shipping: spk.shipping,
        spkItems: spkItemsFormatted,
        invoices: spk.invoices,
        payments: spk.payments
      };
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Shipping GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data pengiriman" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

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
        await tx.spk.update({
          where: { id: spkId },
          data: { 
            shippingId: newShipping.id,
            status: "SHIPPING"
          },
        });
      }

      // 3. Create Shipping Items
      for (const item of items) {
        await tx.shipping_item.create({
          data: {
            id: crypto.randomUUID(),
            shippingId: newShipping.id,
            spkItemId: item.spkItemId,
            qty: item.qty,
          },
        });

        // Di alur Dua-Tahap:
        // 1. readyQty dikurangi SAAT INI (Departure) agar stok fisik di gudang akurat.
        // 2. shippedQty bertambah nanti saat konfirmasi kedatangan (PATCH).
        
        const spkItem = await tx.spkItem.findUnique({ where: { id: item.spkItemId } });
        if (spkItem) {
          const newReadyQty = Math.max(0, (spkItem.readyQty || 0) - item.qty);
          await tx.spkItem.update({
            where: { id: spkItem.id },
            data: { readyQty: newReadyQty }
          });
        }
      }

      return newShipping;
    });

    return NextResponse.json(shipping);
  } catch (error: any) {
    console.error("Shipping POST error:", error);
    return NextResponse.json({ error: error.message || "Gagal memproses pengiriman" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

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
              spk_item: true
            }
          }
        }
      });

      // -----------------------------------------------------------------
      // LOGIKA POTONG STOK FISIK & RECORD TRANSAKSI (KELUAR)
      // -----------------------------------------------------------------
      const { fulfillReservedStock, updateStock } = await import("@/lib/stock");
      
      for (const sItem of ship.shipping_item) {
        const spkItem = sItem.spk_item;
        const qty = sItem.qty;
        
        // Cari SPK terkait untuk informasi transaksi
        const relatedSpk = ship.spks.find(s => s.id === spkItem.spkId);
        const destination = relatedSpk?.lead?.nama_toko || "Customer";
        const memo = `Pengiriman Selesai SPK ${relatedSpk?.spkNumber} - ${spkItem.namaBarang} (Penerima: ${penerimaNama})`;

        // Pastikan itemId ada
        if (spkItem.itemId) {
           // 1. Buat Record Transaksi Terlebih Dahulu
           const transaction = await tx.transaction.create({
             data: {
               date: new Date(),
               type: "KELUAR",
               source: spkItem.fulfillmentMethod === "PRODUCTION" ? "PRODUKSI" : "ORDER_CUSTOMER",
               itemId: spkItem.itemId,
               quantity: qty,
               destination,
               spkNumber: relatedSpk?.spkNumber,
               memo,
               userId: authUser.userId,
             }
           });

           // 2. Potong Stok dengan Safety Check (Mencegah Crash jika ReadyQty Ter-inflasi/Bug)
           const itemMaster = await tx.item.findUnique({ 
             where: { id: spkItem.itemId },
             select: { currentStock: true, reservedStock: true } 
           });
           
           let effectiveQty = qty;
           if (itemMaster) {
             // Cap by physical stock
             effectiveQty = Math.min(effectiveQty, itemMaster.currentStock);
             // Cap by reserved stock if method is FROM_STOCK
             if (spkItem.fulfillmentMethod === "FROM_STOCK") {
               effectiveQty = Math.min(effectiveQty, itemMaster.reservedStock);
             }
           }

           if (effectiveQty > 0) {
             if (spkItem.fulfillmentMethod === "FROM_STOCK") {
               await fulfillReservedStock(spkItem.itemId, effectiveQty, authUser.userId, memo, transaction.id, tx);
             } else {
               await updateStock(spkItem.itemId, effectiveQty, "KELUAR" as any, authUser.userId, memo, transaction.id, tx);
             }
           } else if (qty > 0) {
             console.warn(`[STOCK-SAFETY] Skipping stock deduction for ${spkItem.namaBarang} because current stock is 0 or already deducted.`);
           }
        }

        // 3. Update spkItem: shippedQty & fulfillmentStatus
        // Recalculate total shipped quantity from all finished shipments for this SpkItem
        const finishedShippingItems = await tx.shipping_item.findMany({
          where: {
            spkItemId: spkItem.id,
            shipping: {
              waktuSampai: { not: null }
            }
          },
          select: { qty: true }
        });
        
        const newShippedQty = finishedShippingItems.reduce((sum, item) => sum + item.qty, 0);
        // readyQty SUDAH dikurangi saat POST (Departure). Di sini kita hanya mencatat barang sudah sampai.
        
        await tx.spkItem.update({
          where: { id: spkItem.id },
          data: {
            shippedQty: newShippedQty,
            fulfillmentStatus: newShippedQty >= spkItem.qty ? FulfillmentStatus.FULFILLED : spkItem.fulfillmentStatus
          }
        });
      }

      // Update semua SPK terkait menjadi DONE jika semua item sudah terkirim
      for (const spk of ship.spks) {
        // Re-fetch spkItems after updates above
        const freshItems = await tx.spkItem.findMany({ where: { spkId: spk.id } });
        const allShipped = freshItems.every(item => (item.shippedQty || 0) >= item.qty);
        
        if (allShipped) {
          await tx.spk.update({
            where: { id: spk.id },
            data: { status: SpkStatus.DONE }
          });
        } else {
             await tx.spk.update({
                where: { id: spk.id },
                data: { status: SpkStatus.PARTIAL }
              });
        }
      }

      return ship;
    });

    return NextResponse.json(updatedShipping);
  } catch (error: any) {
    console.error("Shipping PATCH error:", error);
    return NextResponse.json({ error: error.message || "Gagal menyelesaikan pengiriman" }, { status: 500 });
  }
}
