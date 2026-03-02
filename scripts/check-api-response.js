const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const spks = await prisma.spk.findMany({
    where: {
      status: "IN_PROGRESS",
      spkItems: {
        some: {
          fulfillmentMethod: "PRODUCTION",
          productionRequestId: null,
        },
      },
    },
    include: {
      lead: {
        select: {
          id: true,
          nama_toko: true,
          nama_owner: true,
          nama_pic: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      materialUsages: {
        include: {
          material: {
            include: {
              itemType: true,
              unit: true,
            },
          },
        },
      },
      spkItems: {
        where: {
          fulfillmentMethod: "PRODUCTION",
          productionRequestId: null,
        },
        include: {
          salesOrder: {
            select: {
              id: true,
              nama_barang: true,
              spesifikasi_tambahan: true,
            },
          },
        },
      },
    }
  });
  console.log(JSON.stringify(spks, null, 2));
}

main();
