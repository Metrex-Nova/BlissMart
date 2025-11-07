/*
  Warnings:

  - A unique constraint covering the columns `[shopId,productId]` on the table `ProductInventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shopId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "shopId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_shopId_productId_key" ON "public"."ProductInventory"("shopId", "productId");

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
