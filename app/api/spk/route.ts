/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  SpkStatus,
  FulfillmentMethod,
  FulfillmentStatus,
} from "@/lib/constants";
import { reserveStock } from "@/lib/stock";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
    ]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const spks = await prisma.spk.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            nama_toko: true,
            nama_owner: true,
            nama_pic: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        spkItems: {
          include: {
            salesOrder: true,
            item: {
              include: {
                itemType: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ spks });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get SPK error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data SPK" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
    ]);

    const body = await request.json();
    const { leadId, tglSpk, deadline, catatan, spkItems } = body;

    if (!leadId || !spkItems || !Array.isArray(spkItems) || spkItems.length === 0) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // Generate SPK Number (format: SPK/YYYY/MM/XXX)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    
    // Get last SPK number for this month
    const lastSpk = await prisma.spk.findFirst({
      where: {
        spkNumber: {
          startsWith: `SPK/${year}/${month}/`,
        },
      },
      orderBy: {
        spkNumber: "desc",
      },
    });

    let spkNumber: string;
    if (lastSpk) {
      const lastNumber = parseInt(lastSpk.spkNumber.split("/")[3] || "0");
      const nextNumber = lastNumber + 1;
      spkNumber = `SPK/${year}/${month}/${String(nextNumber).padStart(3, "0")}`;
    } else {
      spkNumber = `SPK/${year}/${month}/001`;
    }

    // Buat SPK dan langsung reserve stok untuk item FROM_STOCK
    const spk = await prisma.$transaction(async (tx) => {
      // 1) Create SPK dengan status QUEUE dan item masih PENDING
      const createdSpk = await tx.spk.create({
        data: {
          spkNumber,
          leadId,
          tglSpk: tglSpk ? new Date(tglSpk) : new Date(),
          deadline: deadline ? new Date(deadline) : null,
          catatan,
          status: SpkStatus.QUEUE,
          userId: authUser.userId,
          spkItems: {
            create: spkItems.map((item: any) => ({
              salesOrderId: item.salesOrderId,
              namaBarang: item.namaBarang,
              qty: item.qty,
              satuan: item.satuan,
              fulfillmentMethod:
                item.fulfillmentMethod || FulfillmentMethod.FROM_STOCK,
              itemId: item.itemId || null,
              fulfillmentStatus: FulfillmentStatus.PENDING,
            })),
          },
        },
        include: {
          lead: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          spkItems: {
            include: {
              salesOrder: true,
              item: true,
            },
          },
        },
      });

      // 2) Reserve stock untuk semua item FROM_STOCK (selama masih QUEUE)
      for (const spkItem of createdSpk.spkItems) {
        if (
          spkItem.fulfillmentMethod === FulfillmentMethod.FROM_STOCK &&
          spkItem.itemId &&
          spkItem.fulfillmentStatus === FulfillmentStatus.PENDING
        ) {
          // Reserve stok (tidak mengurangi currentStock, hanya reservedStock)
          await reserveStock(
            spkItem.itemId,
            spkItem.qty,
            authUser.userId,
            `Reserve stok untuk SPK ${createdSpk.spkNumber} (QUEUE) - Item: ${spkItem.namaBarang}`,
            tx
          );

          // Update fulfillment status menjadi RESERVED
          await tx.spkItem.update({
            where: { id: spkItem.id },
            data: { fulfillmentStatus: FulfillmentStatus.RESERVED },
          });
        }
      }

      // Reload SPK dengan data terbaru
      return tx.spk.findUniqueOrThrow({
        where: { id: createdSpk.id },
        include: {
          lead: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          spkItems: {
            include: {
              salesOrder: true,
              item: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ spk }, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" || error.message === "Forbidden")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Create SPK error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat SPK" },
      { status: 500 }
    );
  }
}
