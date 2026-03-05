import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$queryRaw`
    SELECT event_object_table AS table_name,
           trigger_name,
           event_manipulation AS event,
           action_statement AS definition
    FROM information_schema.triggers
    WHERE event_object_table = 'production_request';
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
