import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding dummy waste data...");

  // 1. Get an existing SPK and Material
  const spk = await prisma.spk.findFirst();
  const material = await prisma.item.findFirst({ where: { category: "BAHAN_BAKU" } });

  if (!spk || !material) {
    console.error("No SPK or Material found to seed waste.");
    return;
  }

  // 2. Create WasteStock
  const waste = await prisma.wasteStock.create({
    data: {
      spkId: spk.id,
      materialId: material.id,
      quantity: 15.5,
      notes: "Dummy waste for testing",
    },
  });

  console.log("Created waste:", waste);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
