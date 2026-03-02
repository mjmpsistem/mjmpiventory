import { prisma } from "./prisma";
import {
  FulfillmentMethod,
  FulfillmentStatus,
  SpkStatus,
} from "./constants";

// Treat production as finished when production module marks it DONE
const PRODUCTION_DONE_STATUSES = new Set([
  "DONE",
  FulfillmentStatus.COMPLETED,
  FulfillmentStatus.FULFILLED,
]);

/**
 * Update SPK status to READY_TO_SHIP when all items are finished.
 * Accepts either the global prisma client or a transaction client.
 */
export async function updateSpkStatusIfReady(
  spkId: string,
  tx: any = prisma,
) {
  const spk = await tx.spk.findUnique({
    where: { id: spkId },
    include: { spkItems: true },
  });

  if (!spk) return null;

  // 2. Untuk item FROM_STOCK, otomatis isi readyQty = qty (Siap Kirim)
  // HANYA jika readyQty masih 0 untuk menghindari inflasi saldo saat status berubah/update
  for (const item of spk.spkItems) {
    if (item.fulfillmentMethod === FulfillmentMethod.FROM_STOCK && (item.readyQty || 0) === 0) {
      await tx.spkItem.update({
        where: { id: item.id },
        data: {
          readyQty: item.qty,
          fulfillmentStatus: FulfillmentStatus.RESERVED
        },
      });
    }
  }

  // Re-fetch SPK after potential updates to spkItems
  const updatedSpk = await tx.spk.findUnique({
    where: { id: spkId },
    include: { spkItems: true },
  });

  if (!updatedSpk) return null; // Should not happen if spk was found initially

  const allFinished = updatedSpk.spkItems.every((item: any) => {
    if (item.fulfillmentMethod === FulfillmentMethod.PRODUCTION) {
      return PRODUCTION_DONE_STATUSES.has(item.fulfillmentStatus);
    }

    return item.fulfillmentStatus === FulfillmentStatus.FULFILLED;
  });

  if (allFinished && updatedSpk.status !== SpkStatus.READY_TO_SHIP) {
    // Menghapus update otomatis ke READY_TO_SHIP agar melewati approval gudang secara manual
  }

  return updatedSpk;
}
