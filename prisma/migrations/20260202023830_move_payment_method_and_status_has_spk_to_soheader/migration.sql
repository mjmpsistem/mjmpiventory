/*
  Warnings:

  - You are about to drop the column `hasSpk` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `payment_status` on the `leads` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[soHeaderId]` on the table `spk` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "leads" DROP COLUMN "hasSpk",
DROP COLUMN "payment_method",
DROP COLUMN "payment_status";

-- AlterTable
ALTER TABLE "sales_order_header" ADD COLUMN     "hasSpk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payment_method" TEXT NOT NULL DEFAULT 'Standard',
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'Belum Lunas';

-- CreateIndex
CREATE UNIQUE INDEX "spk_soHeaderId_key" ON "spk"("soHeaderId");
