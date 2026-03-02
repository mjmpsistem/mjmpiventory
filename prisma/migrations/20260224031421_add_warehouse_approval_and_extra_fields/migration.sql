-- AlterTable
ALTER TABLE "spk" ADD COLUMN     "warehouseApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "warehouseApprovedAt" TIMESTAMP(3);
