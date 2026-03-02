/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStock, fulfillReservedStock } from "@/lib/stock";
import {
  UserRole,
  ProductionRequestStatus,
  TransactionType,
  TransactionSource,
  SpkStatus,
  FulfillmentMethod,
  FulfillmentStatus,
} from "@/lib/constants";
import { Prisma } from "@prisma/client";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID permintaan produksi tidak valid" },
        { status: 400 },
      );
    }

    const authUser = await requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
    ]);

    const productionRequest = await prisma.productionRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!productionRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 },
      );
    }

    if (productionRequest.status !== ProductionRequestStatus.PENDING) {
      return NextResponse.json(
        { error: "Status permintaan tidak valid" },
        { status: 400 },
      );
    }

    // ✅ VALIDASI STOK
    for (const reqItem of productionRequest.items) {
      // Untuk bahan baku, kita cek currentStock saja karena material sudah di-reserve
      // (currentStock sudah mencakup reservedStock)
      if (reqItem.item.reservedStock < reqItem.quantity) {
        return NextResponse.json(
          { error: `Reserved stok ${reqItem.item.name} tidak mencukupi.` },
          { status: 400 },
        );
      }
    }

    const transactions = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.productionRequest.update({
          where: { id },
          data: {
            status: ProductionRequestStatus.APPROVED,
            isApproved: true,
            approvedAt: new Date(),
          },
        });

        // Kelompokkan item berdasarkan itemId agar tidak terjadi double deduction
        const groupedItems = productionRequest.items.reduce(
          (acc: any, reqItem) => {
            const itemId = String(reqItem.itemId);
            if (!acc[itemId]) {
              acc[itemId] = 0;
            }
            acc[itemId] += Number(reqItem.quantity);
            return acc;
          },
          {},
        );

        const createdTransactions = [];

        for (const [itemId, quantity] of Object.entries(groupedItems)) {
          const numQuantity = Number(quantity);
          const transaction = await tx.transaction.create({
            data: {
              date: new Date(),
              type: TransactionType.KELUAR,
              source: TransactionSource.BAHAN_BAKU,
              itemId: itemId,
              quantity: numQuantity,
              destination: "Produksi",
              spkNumber: productionRequest.spkNumber,
              memo: `Permintaan produksi SPK ${productionRequest.spkNumber}: ${productionRequest.memo}`,
              userId: authUser.userId,
            },
          });

          await fulfillReservedStock(
            itemId,
            numQuantity,
            authUser.userId,
            `Permintaan produksi SPK ${productionRequest.spkNumber}: ${productionRequest.memo}`,
            transaction.id,
            tx,
          );

          createdTransactions.push(transaction);
        }

        // ✅ LOGIKA BARU: Update Status SPK ke IN_PROGRESS agar muncul di Approval Barang Jadi
        const spk = await tx.spk.findUnique({
          where: { spkNumber: productionRequest.spkNumber },
          include: { spkItems: true }
        });

        if (spk && spk.status === SpkStatus.QUEUE) {
          console.log(`[SYNC] Moving SPK #${spk.spkNumber} to IN_PROGRESS upon PR approval`);
          
          // 1) Update status SPK dan flag persetujuan inventory
          const updatedSpk = await tx.spk.update({
            where: { id: spk.id },
            data: { 
              status: SpkStatus.IN_PROGRESS,
              inventoryApproved: true,
              inventoryApprovedAt: new Date(),
            },
            include: { spkItems: true }
          });

          // 2) Untuk item FROM_STOCK, otomatis isi readyQty = qty (Siap Kirim)
          let hasFromStock = false;
          for (const item of updatedSpk.spkItems) {
            if (item.fulfillmentMethod === FulfillmentMethod.FROM_STOCK) {
              hasFromStock = true;
              await tx.spkItem.update({
                where: { id: item.id },
                data: { 
                  readyQty: item.qty,
                  fulfillmentStatus: FulfillmentStatus.RESERVED 
                },
              });
            }
          }

          // 3) Kirim notifikasi jika ada barang stok yang siap di-approve
          if (hasFromStock) {
            try {
              await tx.notification.create({
                data: {
                  title: "Siap Approve (Stok)",
                  message: `SPK #${updatedSpk.spkNumber} memiliki barang dari stok yang siap di-approve.`,
                  type: "INFO",
                  targetUrl: "/approval-barang-jadi",
                },
              });
            } catch (e) {
              console.error("Failed to notify from PR approval", e);
            }
          }
        }

        return createdTransactions;
      },
    );

    // ✅ CREATE NOTIFICATION for Stock Request
    try {
      console.log(`[NOTIFICATION_LOG] Creating notification for Stock Request from Production Approval: SPK #${productionRequest.spkNumber}`);
      const stockNotification = await prisma.notification.create({
        data: {
          title: "Permintaan Form Stok (Bahan Baku)",
          message: `Bahan baku untuk SPK #${productionRequest.spkNumber} siap diproses.`,
          type: "INFO",
          targetUrl: "/transaksi/barang-keluar",
        },
      });
      console.log(`[NOTIFICATION_LOG] Notification created successfully with ID: ${stockNotification.id}`);
    } catch (notifyError: any) {
      console.error("[NOTIFICATION_LOG] Failed to create notification for Stock Request:", notifyError.message || notifyError);
    }

    return NextResponse.json({
      message: "Permintaan produksi berhasil disetujui",
      transactions,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Approve production request error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyetujui permintaan produksi" },
      { status: 500 },
    );
  }
}
