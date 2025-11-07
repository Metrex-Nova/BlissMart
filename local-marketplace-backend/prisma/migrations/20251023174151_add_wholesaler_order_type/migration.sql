-- CreateEnum
CREATE TYPE "public"."OrderType" AS ENUM ('CUSTOMER_ORDER', 'RETAILER_ORDER');

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "orderType" "public"."OrderType" NOT NULL DEFAULT 'CUSTOMER_ORDER',
ADD COLUMN     "wholesalerId" INTEGER;
