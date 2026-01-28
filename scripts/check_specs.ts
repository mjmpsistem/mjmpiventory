
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking Production Requests...");
  const requests = await prisma.productionRequest.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      spk: {
        include: {
          spkItems: {
            include: {
              salesOrder: true
            }
          }
        }
      }
    }
  });

  if (requests.length === 0) {
    console.log("No Production Requests found.");
  }

  for (const req of requests) {
    console.log(`\nRequest ID: ${req.id}, SPK: ${req.spkNumber}`);
    if (!req.spk) {
        console.log("  [ERROR] SPK not found for this request!");
        continue;
    }
    if (!req.spk.spkItems || req.spk.spkItems.length === 0) {
        console.log("  [WARN] No SPK Items found.");
    }
    for (const item of req.spk.spkItems) {
      console.log(`  - Item: ${item.namaBarang}`);
      if (item.salesOrder) {
        console.log(`    > SalesOrder ID: ${item.salesOrder.id}`);
        console.log(`    > Spec: "${item.salesOrder.spesifikasi_barang}"`);
      } else {
        console.log(`    > [FAIL] No Linked Sales Order (salesOrderId might be null)`);
      }
    }
  }

  console.log("\nChecking SPKs Needing Production...");
  const spks = await prisma.spk.findMany({
      take: 5,
      where: {
          status: 'IN_PROGRESS'
      },
      include: {
          spkItems: {
              include: {
                  salesOrder: true
              }
          }
      }
  });
    for (const spk of spks) {
        console.log(`\nSPK: ${spk.spkNumber} (Status: ${spk.status})`);
        for (const item of spk.spkItems) {
             console.log(`  - Item: ${item.namaBarang}`);
             if (item.salesOrder) {
                console.log(`    > Spec: "${item.salesOrder.spesifikasi_barang}"`);
             } else {
                 console.log(`    > [FAIL] No Linked Sales Order`);
             }
        }
    }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
