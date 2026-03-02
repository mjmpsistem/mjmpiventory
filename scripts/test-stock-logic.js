const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { reserveStock, fulfillReservedStock, getAvailableStock } = require('../lib/stock');

async function main() {
  const testItemCode = 'TEST-STOCK-' + Date.now();
  
  // 1. Create a test item
  const item = await prisma.item.create({
    data: {
      code: testItemCode,
      name: 'Test Stock Item',
      category: 'BAHAN_BAKU',
      currentStock: 1000,
      reservedStock: 0,
      itemType: {
        create: {
          name: 'Test Type ' + Date.now(),
          category: 'BAHAN_BAKU'
        }
      },
      unit: {
        create: {
          name: 'Test Unit ' + Date.now()
        }
      }
    }
  });

  console.log('Step 1: Item created', { current: item.currentStock, reserved: item.reservedStock });

  const userId = '1831b637-a9fa-480b-93fe-1ad09901ca43'; // Super Admin

  // 2. Reserve stock
  await prisma.$transaction(async (tx) => {
    await reserveStock(item.id, 100, userId, 'Test Reservation', tx);
  });

  const itemAfterReserve = await prisma.item.findUnique({ where: { id: item.id } });
  console.log('Step 2: After Reserve 100', { current: itemAfterReserve.currentStock, reserved: itemAfterReserve.reservedStock });

  // 3. Fulfill stock
  await prisma.$transaction(async (tx) => {
    await fulfillReservedStock(item.id, 100, userId, 'Test Fulfillment', 'tx-id', tx);
  });

  const itemAfterFulfill = await prisma.item.findUnique({ where: { id: item.id } });
  console.log('Step 3: After Fulfill 100', { current: itemAfterFulfill.currentStock, reserved: itemAfterFulfill.reservedStock });

  if (itemAfterFulfill.reservedStock === 0 && itemAfterFulfill.currentStock === 900) {
    console.log('SUCCESS: Stock logic is working correctly in isolation!');
  } else {
    console.log('FAILURE: Stock logic is broken!');
  }

  // Cleanup
  await prisma.item.delete({ where: { id: item.id } });
}

main().catch(console.error).finally(() => prisma.$disconnect());
