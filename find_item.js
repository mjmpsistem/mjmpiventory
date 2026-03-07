const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const code = "AUTO-3AB71B18";
  console.log("Searching for:", code);

  const item = await prisma.item.findFirst({
    where: { 
      OR: [
        { code: { contains: code } },
        { name: { contains: code } },
        { id: { contains: code } }
      ] 
    },
    include: { transactions: { take: 5, orderBy: { date: "desc" } } }
  });

  if (item) {
    console.log("ITEM_FOUND:", JSON.stringify(item, null, 2));
    return;
  }

  const spk = await prisma.sPK.findFirst({
    where: {
      OR: [
        { spkNumber: { contains: code } },
        { id: { contains: code } }
      ]
    },
    include: { items: true }
  });

  if (spk) {
    console.log("SPK_FOUND:", JSON.stringify(spk, null, 2));
    return;
  }
  
  const trans = await prisma.transaction.findFirst({
    where: {
      OR: [
        { id: { contains: code } },
        { memo: { contains: code } }
      ]
    },
    include: { item: true }
  });
  
  if (trans) {
    console.log("TRANSACTION_FOUND:", JSON.stringify(trans, null, 2));
    return;
  }

  console.log("NOT_FOUND");
}

main().catch(console.error).finally(() => prisma.$disconnect());
