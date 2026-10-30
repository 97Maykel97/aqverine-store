-- CreateTable
CREATE TABLE "cart_merge_events" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "merge_key" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_merge_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_merge_events_created_at_idx" ON "cart_merge_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cart_merge_events_cart_id_merge_key_key" ON "cart_merge_events"("cart_id", "merge_key");

-- AddForeignKey
ALTER TABLE "cart_merge_events" ADD CONSTRAINT "cart_merge_events_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep merge records server-only, matching the rest of the public schema.
ALTER TABLE "cart_merge_events" ENABLE ROW LEVEL SECURITY;
