import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$queryRaw`
    SELECT pg_get_functiondef(oid) 
    FROM pg_proc 
    WHERE proname = 'notify_on_new_record';
  `
  console.dir(result, { depth: null })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
