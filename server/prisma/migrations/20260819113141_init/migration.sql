-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "trip_status" AS ENUM ('planned', 'ongoing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "expense_category" AS ENUM ('fuel', 'food', 'hotel', 'parking', 'toll', 'bike_service', 'emergency', 'other');

-- CreateEnum
CREATE TYPE "checklist_category" AS ENUM ('documents', 'riding_gear', 'bike_preparation', 'electronics', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bikes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "engine_cc" INTEGER NOT NULL,
    "mileage_kmpl" DECIMAL(6,2) NOT NULL,
    "tank_litres" DECIMAL(6,2) NOT NULL,
    "odometer_km" DECIMAL(10,1) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bike_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_location" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "trip_status" NOT NULL DEFAULT 'planned',
    "est_distance_km" DECIMAL(10,2) NOT NULL,
    "est_mileage_kmpl" DECIMAL(6,2) NOT NULL,
    "est_fuel_price" DECIMAL(8,2) NOT NULL,
    "est_budget" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "fuel_log_id" UUID,
    "category" "expense_category" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "spent_on" DATE NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_logs" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "filled_on" DATE NOT NULL,
    "litres" DECIMAL(8,3) NOT NULL,
    "price_per_litre" DECIMAL(8,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "odometer_km" DECIMAL(10,1),
    "is_full_tank" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "category" "checklist_category" NOT NULL,
    "title" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "bikes_user_id_idx" ON "bikes"("user_id");

-- CreateIndex
CREATE INDEX "trips_user_id_status_idx" ON "trips"("user_id", "status");

-- CreateIndex
CREATE INDEX "trips_bike_id_idx" ON "trips"("bike_id");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_fuel_log_id_key" ON "expenses"("fuel_log_id");

-- CreateIndex
CREATE INDEX "expenses_trip_id_category_idx" ON "expenses"("trip_id", "category");

-- CreateIndex
CREATE INDEX "expenses_trip_id_spent_on_idx" ON "expenses"("trip_id", "spent_on");

-- CreateIndex
CREATE INDEX "fuel_logs_trip_id_filled_on_idx" ON "fuel_logs"("trip_id", "filled_on");

-- CreateIndex
CREATE INDEX "checklist_items_trip_id_category_sort_order_idx" ON "checklist_items"("trip_id", "category", "sort_order");

-- AddForeignKey
ALTER TABLE "bikes" ADD CONSTRAINT "bikes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fuel_log_id_fkey" FOREIGN KEY ("fuel_log_id") REFERENCES "fuel_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Constraints Prisma's schema language cannot express.
-- These are the database's own guarantees: they hold even if an application
-- bug gets past request validation.
-- ---------------------------------------------------------------------------

-- Bikes: physical quantities are positive; an odometer may read zero but never less.
ALTER TABLE "bikes"
  ADD CONSTRAINT "bikes_engine_cc_positive"    CHECK ("engine_cc" > 0),
  ADD CONSTRAINT "bikes_mileage_positive"      CHECK ("mileage_kmpl" > 0),
  ADD CONSTRAINT "bikes_tank_positive"         CHECK ("tank_litres" > 0),
  ADD CONSTRAINT "bikes_odometer_non_negative" CHECK ("odometer_km" >= 0);

-- At most one default bike per rider. A partial unique index makes two
-- concurrent "set as default" requests impossible to both succeed.
CREATE UNIQUE INDEX "bikes_one_default_per_user"
  ON "bikes" ("user_id") WHERE "is_default";

-- Trips: a trip covers real distance on real fuel, and cannot end before it starts.
ALTER TABLE "trips"
  ADD CONSTRAINT "trips_distance_positive"   CHECK ("est_distance_km" > 0),
  ADD CONSTRAINT "trips_mileage_positive"    CHECK ("est_mileage_kmpl" > 0),
  ADD CONSTRAINT "trips_fuel_price_positive" CHECK ("est_fuel_price" > 0),
  ADD CONSTRAINT "trips_budget_non_negative" CHECK ("est_budget" >= 0),
  ADD CONSTRAINT "trips_dates_ordered"       CHECK ("end_date" IS NULL OR "end_date" >= "start_date");

-- Expenses: every row is a real amount of money.
ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_amount_positive" CHECK ("amount" > 0);

-- The fuel/expense invariant, enforced structurally rather than by convention:
-- an expense is in the `fuel` category if and only if a fuel log created it.
-- This is what makes double-counted fuel spend impossible rather than merely
-- discouraged, so SUM(expenses.amount) is always the true trip total.
ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_fuel_comes_from_fuel_log"
  CHECK (("category" = 'fuel') = ("fuel_log_id" IS NOT NULL));

-- Fuel logs: a fill has volume, a price, and a cost.
ALTER TABLE "fuel_logs"
  ADD CONSTRAINT "fuel_logs_litres_positive"     CHECK ("litres" > 0),
  ADD CONSTRAINT "fuel_logs_price_positive"      CHECK ("price_per_litre" > 0),
  ADD CONSTRAINT "fuel_logs_total_cost_positive" CHECK ("total_cost" > 0),
  ADD CONSTRAINT "fuel_logs_odometer_non_negative"
    CHECK ("odometer_km" IS NULL OR "odometer_km" >= 0);
