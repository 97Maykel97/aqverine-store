-- Keep the persisted order snapshot internally consistent, even if a writer bypasses the application service.
-- Cast before multiplication so an oversized product cannot overflow a 32-bit integer.
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_line_total_matches_unit_price_quantity"
  CHECK ("line_total_minor" = "unit_price_minor"::bigint * "quantity");
