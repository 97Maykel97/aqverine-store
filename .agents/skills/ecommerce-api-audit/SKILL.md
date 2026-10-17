---
name: ecommerce-api-audit
description: Safely audit AQVERINE internal e-commerce APIs and create a sanitized Markdown report for backend developers.
---

# E-commerce API Audit

Run `node scripts/audit-ecommerce-api.mjs` from this skill directory with `ECOMMERCE_AUDIT_BASE_URL` set to the target environment URL. It must never default to `localhost:3000`. The script resolves the report directory from its own location, so it always writes to the repository-level `docs/reports` directory.

The audit reads endpoint definitions only from `references/source-contracts.mjs`. It performs safe GET requests, except explicitly marked isolated test endpoints. It checks products, variants, stock, prices, cart and order read contracts, order statuses, error shapes, invalid IDs, negative quantities, invalid price formats, stock mismatches, and unauthorized access to admin endpoints.

Never include real email addresses, phone numbers, tokens, payment IDs, webhook secrets, or order content in console output or reports. Save the sanitized report as `docs/reports/ecommerce-api-audit-YYYY-MM-DD.md`.
