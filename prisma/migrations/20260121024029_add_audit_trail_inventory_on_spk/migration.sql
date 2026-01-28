-- AlterTable
ALTER TABLE "spk" ADD COLUMN     "inventoryApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inventoryApprovedAt" TIMESTAMP(3),
ADD COLUMN     "inventoryUserId" UUID;
