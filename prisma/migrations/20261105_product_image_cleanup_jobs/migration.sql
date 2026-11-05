-- Store cleanup requests in the same transaction that removes product image references.
CREATE TABLE "product_image_cleanup_jobs" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_image_cleanup_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_image_cleanup_jobs_attempts_check" CHECK ("attempts" >= 0),
    CONSTRAINT "product_image_cleanup_jobs_storage_key_check" CHECK (length("storage_key") > 0)
);

CREATE UNIQUE INDEX "product_image_cleanup_jobs_storage_key_key" ON "product_image_cleanup_jobs"("storage_key");
CREATE INDEX "image_cleanup_due_idx"
    ON "product_image_cleanup_jobs"("completed_at", "next_attempt_at", "created_at");

-- Browser-facing Supabase roles have no access policy for the cleanup queue.
ALTER TABLE "product_image_cleanup_jobs" ENABLE ROW LEVEL SECURITY;
