/*
  Warnings:

  - A unique constraint covering the columns `[cartId,productId,shopId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_shopId_key" ON "public"."CartItem"("cartId", "productId", "shopId");
