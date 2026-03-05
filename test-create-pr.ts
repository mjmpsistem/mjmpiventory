import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const spkRetur = await prisma.spkRetur.findFirst({
    include: {
      materialUsages: true,
      returnItems: true
    }
  })
  
  if (!spkRetur) {
    console.log("No SpkRetur found");
    return;
  }
  
  console.log("Found SpkRetur:", spkRetur.spkNumber);
  
  // Try to create PR
  try {
      const items = spkRetur.materialUsages.map(mu => ({
          itemId: mu.materialId,
          quantity: mu.quantityNeeded
      }));
      
      console.log("Items:", items);

      const productionRequest = await prisma.$transaction(async (tx) => {
        const userId = (await prisma.user.findFirst())?.id;
        // Create production request
        const newRequest = await tx.productionRequest.create({
          data: {
            spkNumber: undefined,
            spkReturNumber: spkRetur.spkNumber,
            productName: "Test PR",
            memo: "Test PR for SpkRetur",
            userId: userId!,
            status: "PENDING",
            items: {
              create: items.map((item: any) => ({
                itemId: item.itemId,
                quantity: item.quantity,
              })),
            },
          },
        });
        
        console.log("Created PR:", newRequest.id);
        
        await tx.spkReturItem.updateMany({
            where: {
              spkReturId: spkRetur.id,
              fulfillmentMethod: "PRODUCTION",
              productionRequestId: null,
            },
            data: {
              productionRequestId: newRequest.id,
            },
          });
          
         return newRequest;
      });
      console.log("Success PR created:", productionRequest.id)
  } catch (e: any) {
      console.error("Error creating PR:", e.message);
      console.error(e);
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
