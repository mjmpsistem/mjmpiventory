-- AlterTable
ALTER TABLE "payment_history" ADD COLUMN     "soHeaderId" INTEGER,
ADD COLUMN     "spkId" UUID;

-- AddForeignKey
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_spkId_fkey" FOREIGN KEY ("spkId") REFERENCES "spk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_soHeaderId_fkey" FOREIGN KEY ("soHeaderId") REFERENCES "sales_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
