-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('IN_APP', 'FCM_PUSH', 'SMS', 'EMAIL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'ORDER_PLACED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'ORDER_CONFIRMED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'ORDER_DISPATCHED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'ORDER_DELIVERED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'LOW_STOCK';
ALTER TYPE "public"."NotificationType" ADD VALUE 'RESTOCK_ALERT';
ALTER TYPE "public"."NotificationType" ADD VALUE 'NEW_PRODUCT';
ALTER TYPE "public"."NotificationType" ADD VALUE 'WHOLESALER_ORDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'FEEDBACK_REQUEST';

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "actionUrl" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "sentVia" "public"."NotificationChannel" NOT NULL DEFAULT 'IN_APP';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "fcmToken" TEXT,
ADD COLUMN     "notificationPrefs" JSONB,
ADD COLUMN     "preferredLat" DOUBLE PRECISION,
ADD COLUMN     "preferredLng" DOUBLE PRECISION;
