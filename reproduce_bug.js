
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const itemId = 'PASTE_ITEM_ID_HERE'; // I will get this later
  
  console.log('--- INITIAL STATE ---');
  let item = await prisma.item.findUnique({ where: { id: itemId } });
  console.log(`Current: ${item.currentStock}, Reserved: ${item.reservedStock}`);

  // Simulate Creation
  console.log('\n--- AFTER RESERVATION (10) ---');
  await prisma.item.update({
    where: { id: itemId },
    data: { reservedStock: { increment: 10 } }
  });
  item = await prisma.item.findUnique({ where: { id: itemId } });
  console.log(`Current: ${item.currentStock}, Reserved: ${item.reservedStock}`);

  // Simulate Approval
  console.log('\n--- AFTER APPROVAL (10) ---');
  await prisma.item.update({
    where: { id: itemId },
    data: { 
      currentStock: { decrement: 10 },
      reservedStock: { decrement: 10 }
    }
  });
  item = await prisma.item.findUnique({ where: { id: itemId } });
  console.log(`Current: ${item.currentStock}, Reserved: ${item.reservedStock}`);

  // Simulate Re-stock for next test
  await prisma.item.update({
    where: { id: itemId },
    data: { currentStock: { increment: 10 } }
  });

  // Simulate Rejection
  console.log('\n--- AFTER REJECTION (10) ---');
  // First reserve again
  await prisma.item.update({
    where: { id: itemId },
    data: { reservedStock: { increment: 10 } }
  });
  // Then reject
  await prisma.item.update({
    where: { id: itemId },
    data: { reservedStock: { decrement: 10 } }
  });
  item = await prisma.item.findUnique({ where: { id: itemId } });
  console.log(`Current: ${item.currentStock}, Reserved: ${item.reservedStock}`);
}

// test();
