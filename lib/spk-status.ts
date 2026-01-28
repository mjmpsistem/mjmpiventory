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

  const allFinished = spk.spkItems.every((item) => {
    if (item.fulfillmentMethod === FulfillmentMethod.PRODUCTION) {
      return PRODUCTION_DONE_STATUSES.has(item.fulfillmentStatus);
    }

    return item.fulfillmentStatus === FulfillmentStatus.FULFILLED;
  });

  if (allFinished && spk.status !== SpkStatus.READY_TO_SHIP) {
    return tx.spk.update({
      where: { id: spkId },
      data: { status: SpkStatus.READY_TO_SHIP },
    });
  }

  return spk;
}
