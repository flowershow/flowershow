-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('SITE', 'ACCOUNT', 'MANUAL');

-- CreateEnum
CREATE TYPE "AccountPlan" AS ENUM ('PRO', 'UNLIMITED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripe_customer_id" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "consolidated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "covered_by_account_plan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan_source" "PlanSource";

-- CreateTable
CREATE TABLE "AccountSubscription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "plan" "AccountPlan" NOT NULL,
    "interval" TEXT NOT NULL,
    "site_allowance" INTEGER,
    "status" "SubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountSubscription_user_id_key" ON "AccountSubscription"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSubscription_stripe_subscription_id_key" ON "AccountSubscription"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "AccountSubscription" ADD CONSTRAINT "AccountSubscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: PREMIUM sites with a live Stripe subscription are SITE-sourced.
UPDATE "Site" s SET plan_source = 'SITE'
 WHERE s.plan = 'PREMIUM'
   AND EXISTS (SELECT 1 FROM "Subscription" sub WHERE sub.site_id = s.id
               AND sub.status NOT IN ('canceled','incomplete_expired'));

-- Remaining PREMIUM sites were granted manually.
UPDATE "Site" SET plan_source = 'MANUAL'
 WHERE plan = 'PREMIUM' AND plan_source IS NULL;
