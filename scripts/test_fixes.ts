import { prisma } from "../lib/prisma";
import { reserveStock, releaseReservedStock } from "../lib/stock";
import { SpkStatus, ProductionRequestStatus } from "../lib/constants";

async function testFixes() {
  const VALID_USER_ID = "1831b637-a9fa-480b-93fe-1ad09901ca43";
  console.log("🚀 Starting verification tests for grouping and rejection...");

  // Setup: Create test item and SPK
  const itemType = await prisma.itemType.findFirst();
  const unit = await prisma.unit.findFirst();
  
  const testItem = await prisma.item.create({
    data: {
      code: "TEST-FIX-" + Date.now(),
      name: "Test Fix Item",
      category: "BAHAN_BAKU",
      currentStock: 100,
      reservedStock: 0,
      itemTypeId: itemType?.id || "",
      unitId: unit?.id || "",
    },
  });

  const testSpk = await prisma.spk.create({
    data: {
      spkNumber: "SPK-TEST-" + Date.now(),
      leadId: (await prisma.lead.findFirst())?.id || 1,
      status: SpkStatus.IN_PROGRESS,
      userId: VALID_USER_ID,
    },
  });

  const testPR = await prisma.productionRequest.create({
    data: {
      spkNumber: testSpk.spkNumber,
      productName: "Test Product",
      memo: "Test Memo",
      status: ProductionRequestStatus.PENDING,
      userId: VALID_USER_ID,
      items: {
        create: [
          { itemId: testItem.id, quantity: 10 },
          { itemId: testItem.id, quantity: 10 }, // Duplicate itemId
        ],
      },
    },
    include: { items: true },
  });

  try {
    // 1. Manually simulate the grouping and reservation logic (as per app/api/production-requests/route.ts)
    console.log("🧪 Testing grouping logic simulation...");
    const grouped = testPR.items.reduce((acc: any, item: any) => {
      acc[item.itemId] = (acc[item.itemId] || 0) + item.quantity;
      return acc;
    }, {});

    for (const [itemId, quantity] of Object.entries(grouped)) {
      await reserveStock(itemId, quantity as number, VALID_USER_ID, "Test grouping", undefined);
    }

    let updatedItem = await prisma.item.findUnique({ where: { id: testItem.id } });
    console.log(`   - Reserved stock after grouping: ${updatedItem?.reservedStock}`);
    if (updatedItem?.reservedStock !== 20) throw new Error("Grouping/Reservation failed");

    // 2. Test rejection logic simulation (as per app/api/production-requests/[id]/reject/route.ts)
    console.log("🧪 Testing rejection logic simulation...");
    await prisma.$transaction(async (tx) => {
        // Revert SPK status
        await tx.spk.update({
            where: { id: testSpk.id },
            data: { status: SpkStatus.QUEUE }
        });

        // Release stock
        for (const [itemId, quantity] of Object.entries(grouped)) {
            await releaseReservedStock(itemId, quantity as number, VALID_USER_ID, "Test rejection", tx);
        }
    });

    updatedItem = await prisma.item.findUnique({ where: { id: testItem.id } });
    const updatedSpk = await prisma.spk.findUnique({ where: { id: testSpk.id } });
    console.log(`   - Reserved stock after rejection: ${updatedItem?.reservedStock}`);
    console.log(`   - SPK status after rejection: ${updatedSpk?.status}`);

    if (updatedItem?.reservedStock !== 0) throw new Error("Stock release failed");
    if (updatedSpk?.status !== SpkStatus.QUEUE) throw new Error("SPK status revert failed");

    console.log("🎉 All grouping and rejection tests passed!");
  } finally {
    // Cleanup
    await prisma.productionRequestItem.deleteMany({ where: { productionRequestId: testPR.id } });
    await prisma.productionRequest.delete({ where: { id: testPR.id } });
    await prisma.spk.delete({ where: { id: testSpk.id } });
    await prisma.stockHistory.deleteMany({ where: { itemId: testItem.id } });
    await prisma.item.delete({ where: { id: testItem.id } });
    console.log("🧹 Cleanup complete.");
  }
}

testFixes().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
