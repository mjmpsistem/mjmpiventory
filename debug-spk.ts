
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const spk = await prisma.spk.findFirst({
    where: { spkNumber: 'SPK-20260225-011' },
    include: {
      spkItems: {
        include: {
          shipping_item: {
            include: {
              shipping: true
            }
          }
        }
      }
    }
  })

  console.log(JSON.stringify(spk, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
