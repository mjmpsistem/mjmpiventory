import { prisma } from "@/lib/prisma";

/**
 * Syncs waste quantity from production log to WasteStock table.
 * Should be called whenever a production activity (with waste) is recorded.
 */
export async function syncWasteFromProduction(
  spkId: string,
  materialId: string,
  wasteQty: number,
  notes?: string
) {
  if (wasteQty <= 0) return;

  try {
    // Check if a waste record already exists for this SPK + Material combination
    const existingWaste = await prisma.wasteStock.findFirst({
      where: {
        spkId: spkId,
        materialId: materialId,
      },
    });

    if (existingWaste) {
      // Update existing record
      await prisma.wasteStock.update({
        where: { id: existingWaste.id },
        data: {
          quantity: { increment: wasteQty },
          notes: notes ? `${existingWaste.notes ? existingWaste.notes + "; " : ""}${notes}` : existingWaste.notes,
        },
      });
    } else {
      // Create new record
      await prisma.wasteStock.create({
        data: {
          spkId,
          materialId,
          quantity: wasteQty,
          notes: notes,
        },
      });
    }
    // ✅ CREATE NOTIFICATION
    try {
      const material = await prisma.item.findUnique({
        where: { id: materialId },
        select: { name: true }
      });
      const spk = await prisma.spk.findUnique({
        where: { id: spkId },
        select: { spkNumber: true }
      });

      console.log(`[NOTIFICATION_LOG] Creating notification for Waste Sync: ${wasteQty} Kg ${material?.name || 'Material'}`);
      const wasteNotification = await prisma.notification.create({
        data: {
          title: "Pencatatan Waste Baru",
          message: `${wasteQty} Kg ${material?.name || 'Material'} (SPK: ${spk?.spkNumber || 'N/A'})`,
          type: "WARNING",
          targetUrl: "/transaksi/waste",
        },
      });
      console.log(`[NOTIFICATION_LOG] Notification created successfully with ID: ${wasteNotification.id}`);
    } catch (notifyError: any) {
      console.error("[NOTIFICATION_LOG] Failed to create notification for waste sync:", notifyError.message || notifyError);
    }
    
    console.log(`Synced waste for SPK ${spkId}: +${wasteQty}`);
  } catch (error) {
    console.error("Error syncing waste from production:", error);
    // Don't throw error to prevent blocking the main production flow? 
    // Or maybe throw if strict consistency is required.
    throw error;
  }
}
