---
name: payment-webhook-audit
description: Audit payment-webhook security and idempotency without exposing payment or personal data.
---

# Payment Webhook Audit

Audit the webhook implementation and its isolated test environment. Verify that the webhook secret is absent from client bundles, signatures are validated, invalid signatures receive `401` or `403`, duplicate events are idempotent, retries do not create another order, `paid` transitions once, and `cancelled`/`failed` do not transition to `paid`.

Use only isolated webhook fixtures or provider sandbox events. Never send real credentials, card data, tokens, customer data, or orders. Reports must exclude payment credentials, tokens, personal data, provider event identifiers, and internal error details. Save the sanitized Markdown report as `docs/reports/payment-webhook-audit-YYYY-MM-DD.md`.
