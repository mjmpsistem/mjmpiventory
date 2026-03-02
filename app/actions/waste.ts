"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TransactionType, TransactionSource } from "@/lib/constants";
import { updateStock } from "@/lib/stock";

export async function getWasteStocks({
  spkNumber,
  status,
}: {
  spkNumber?: string;
  status?: string;
}) {
  const where: any = {};

  if (spkNumber) {
    where.spk = {
      spkNumber: {
        contains: spkNumber,
        mode: "insensitive",
      },
    };
  }

  // Status filter logic:
  // Since WasteStock doesn't have a direct 'status' field, we infer it.
  // Pending = quantity > 0
  // Completed = quantity == 0 (fully recycled)
  if (status === "PENDING") {
    where.quantity = { gt: 0 };
  } else if (status === "COMPLETED") {
    where.quantity = { equals: 0 };
  }

  try {
    const wasteStocks = await prisma.wasteStock.findMany({
      where,
      include: {
        material: {
          include: {
             itemType: { select: { name: true } }
          }
        },
        spk: {
          select: {
            id: true,
            spkNumber: true,
            spkItems: {
               select: {
                 namaBarang: true 
               }
            }
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: wasteStocks };
  } catch (error) {
    console.error("Error fetching waste stocks:", error);
    return { success: false, error: "Gagal memuat data waste." };
  }
}

import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function processRecycling({
  wasteId,
  quantity,
  recycleType, // "RETURN_TO_ORIGIN" | "NEW_ITEM"
  targetItemId,
}: {
  wasteId: string;
  quantity: number;
  recycleType: "RETURN_TO_ORIGIN" | "NEW_ITEM";
  targetItemId?: string;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = user.userId;

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Get Waste Record
      const waste = await tx.wasteStock.findUnique({
        where: { id: wasteId },
        include: { material: true, spk: true },
      });

      if (!waste) {
        throw new Error("Data waste tidak ditemukan.");
      }

      if (waste.quantity < quantity) {
        throw new Error("Jumlah daur ulang melebihi stok waste yang tersedia.");
      }

      // 2. Determine Target Item
      let targetId = "";
      if (recycleType === "RETURN_TO_ORIGIN") {
        targetId = waste.materialId;
      } else {
        if (!targetItemId) {
          throw new Error("Target item harus dipilih untuk opsi Item Baru.");
        }
        targetId = targetItemId;
      }

      // 3. Update Waste Stock (Reduce Quantity)
      await tx.wasteStock.update({
        where: { id: wasteId },
        data: {
          quantity: { decrement: quantity },
        },
      });

      // 4. Create Transaction & Update Stock (Increase Target Stock)
      // We leverage the existing logic, but we might need to call updateStock directly 
      // or manually insert if we want to be explicit about the source properly.
      // Let's use updateStock from lib/stock.ts as it handles history too.
      
      const reason = `Daur Ulang dari SPK ${waste.spk.spkNumber} (Waste: ${waste.quantity}kg -> Recycled: ${quantity}kg)`;

      // Create Transaction Record explicitly
      const transaction = await tx.transaction.create({
        data: {
          date: new Date(),
          type: TransactionType.MASUK,
          source: TransactionSource.DAUR_ULANG,
          itemId: targetId,
          quantity: quantity,
          spkNumber: waste.spk.spkNumber,
          memo: reason,
          userId: userId,
        },
      });

      // Update Item Stock & History
      await updateStock(
        targetId,
        quantity,
        TransactionType.MASUK,
        userId,
        reason,
        transaction.id,
        tx
      );

      return { success: true };
    });
  } catch (error: any) {
    console.error("Error processing recycling:", error);
    return { success: false, error: error.message || "Gagal memproses daur ulang." };
  }
}

export async function getMaterialsForRecycleDropdown() {
  try {
     const items = await prisma.item.findMany({
       where: {
         isActive: true,
         category: 'BAHAN_BAKU',
       },
       select: {
         id: true,
         name: true,
         code: true,
         currentStock: true,
         unit: { select: { name: true } },
         category: true,
         itemType: { select: { name: true } }
       },
       orderBy: { name: 'asc' }
     });
     return { success: true, data: items };
  } catch (error) {
    console.error("Error fetching items:", error);
    return { success: false, data: [] };
  }
}
