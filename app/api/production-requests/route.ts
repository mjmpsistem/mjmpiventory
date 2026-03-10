/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStock, getAvailableStock, reserveStock } from "@/lib/stock";
import {
  UserRole,
  ProductionRequestStatus,
  TransactionType,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY, UserRole.ADMIN]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const approvedOnly = searchParams.get("approvedOnly");

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (approvedOnly === "true") {
      where.status = ProductionRequestStatus.APPROVED;
      where.isApproved = true;
    }

    const requests = await prisma.productionRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },

        // 🔥 INI YANG KURANG
        spk: {
          include: {
            lead: true,
            spkItems: {
              include: {
                salesOrder: {
                  select: {
                    id: true,
                    spesifikasi_tambahan: true,
                  },
                },
                shipping_item: {
                  include: {
                    shipping: true
                  }
                }
              },
            },
          },
        },

        spkRetur: {
          include: {
            parentSpk: {
              include: {
                lead: true
              }
            },
            returnItems: {
              include: {
                item: true,
                originalSpkItem: {
                  include: {
                    salesOrder: true
                  }
                }
              }
            },
            materialUsages: {
              include: {
                material: {
                  include: {
                    itemType: true,
                    unit: true
                  }
                }
              }
            }
          }
        },

        // existing
        items: {
          include: {
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

    const formattedRequests = requests.map((req: any) => ({
      ...req,
      spkNumber: req.spkNumber || req.spkReturNumber
    }));

    return NextResponse.json({ requests: formattedRequests });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Get production requests error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY]);

    const body = await request.json();
    const { spkNumber, productName, items, memo, targetItemId, targetQuantity } = body;
    const authUser = requireAuth(request, [UserRole.SUPERADMIN, UserRole.FOUNDER, UserRole.KEPALA_INVENTORY]);

    if (
      (!spkNumber && !targetItemId) ||
      !productName ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !memo
    ) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Memo wajib diisi." },
        { status: 400 },
      );
    }

    // Validate stock availability
    for (const item of items) {
      const dbItem = await prisma.item.findUnique({
        where: { id: item.itemId },
      });
      if (!dbItem) {
        return NextResponse.json(
          { error: `Item ${item.itemId} tidak ditemukan` },
          { status: 400 },
        );
      }

      const availableStock = dbItem.currentStock;
      if (availableStock < item.quantity) {
        return NextResponse.json(
          {
            error: `Stok ${dbItem.name} tidak mencukupi. Stok tersedia: ${availableStock}, dibutuhkan: ${item.quantity}`,
          },
          { status: 400 },
        );
      }
    }

    // Determine if it's a regular SPK or SPK Retur (if spkNumber is provided)
    let spk = null;
    let spkRetur = null;
    if (spkNumber) {
      spk = await prisma.spk.findUnique({ where: { spkNumber } });
      spkRetur = await prisma.spkRetur.findUnique({ where: { spkNumber } });

      if (!spk && !spkRetur) {
        return NextResponse.json(
          { error: `Nomor SPK ${spkNumber} tidak ditemukan` },
          { status: 400 },
        );
      }
    }

    // Create production request
    const productionRequest = await prisma.$transaction(async (tx) => {
      // Create production request
      const newRequest = await tx.productionRequest.create({
        data: {
          spkNumber: spk ? spkNumber : null,
          spkReturNumber: spkRetur ? spkNumber : null,
          productName,
          memo,
          userId: authUser.userId,
          status: ProductionRequestStatus.PENDING,
          targetItemId: targetItemId || null,
          targetQuantity: targetQuantity || 0,
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
              quantity: item.quantity,
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
          targetItem: {
            include: { unit: true }
          },
          items: {
            include: {
              item: {
                include: {
                  itemType: true,
                  unit: true,
                },
              },
            },
          },
        },
      });

      if (spk) {
        await tx.spkItem.updateMany({
          where: {
            spkId: spk.id,
            fulfillmentMethod: "PRODUCTION",
            productionRequestId: null,
          },
          data: {
            productionRequestId: newRequest.id,
          },
        });
      } else if (spkRetur) {
        await tx.spkReturItem.updateMany({
          where: {
            spkReturId: spkRetur.id,
            fulfillmentMethod: "PRODUCTION",
            productionRequestId: null,
          },
          data: {
            productionRequestId: newRequest.id,
          },
        });
      }

      return newRequest;
    });

    // ✅ CREATE NOTIFICATION
    try {
      const identifier = spkNumber ? `SPK #${spkNumber}` : "Manual";
      const prNotification = await prisma.notification.create({
        data: {
          title: "Permintaan Produksi Baru",
          message: `${identifier} - ${productName}`,
          type: "INFO",
          targetUrl: "/permintaan-produksi",
        },
      });
    } catch (notifyError: any) {
      console.error("[NOTIFICATION_LOG] Failed to create notification for PR:", notifyError.message || notifyError);
    }

    return NextResponse.json({ productionRequest }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Nomor SPK sudah ada" },
        { status: 400 },
      );
    }
    console.error("Create production request error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
