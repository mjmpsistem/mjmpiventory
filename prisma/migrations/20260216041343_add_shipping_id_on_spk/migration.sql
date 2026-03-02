-- AlterTable
ALTER TABLE "spk" ADD COLUMN     "shippingId" UUID;

-- AddForeignKey
ALTER TABLE "spk" ADD CONSTRAINT "spk_shippingId_fkey" FOREIGN KEY ("shippingId") REFERENCES "shipping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
