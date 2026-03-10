-- AlterTable
ALTER TABLE "production_request" ADD COLUMN     "targetItemId" UUID,
ADD COLUMN     "targetQuantity" DOUBLE PRECISION DEFAULT 0;

-- AddForeignKey
ALTER TABLE "production_request" ADD CONSTRAINT "production_request_targetItemId_fkey" FOREIGN KEY ("targetItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
