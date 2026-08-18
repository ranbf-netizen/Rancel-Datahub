# DataMart Agent Store API (data bundle supplier)

Base URL: `https://api.datamartgh.shop/api/store/v1`
Get an API key from DataMart's Developer API settings page.

## Auth
`Authorization: Bearer ask_YOUR_KEY` (or `x-api-key` header if Bearer isn't usable)

## Networks
`YELLO` (MTN), `TELECEL` (Telecel), `AT_PREMIUM` (AirtelTigo) - mapped internally to our
short keys `mtn`, `telecel`, `airteltigo` in `src/lib/supplier.ts`.

## Important: orders are asynchronous
`POST /orders` only confirms the order was **accepted** (status: "pending"). Actual delivery
completion arrives ~30 seconds later via webhook (`order.completed` / `order.failed`), NOT
in the initial response. Our code accounts for this - see `fulfillDataOrder()` in
`src/lib/fulfillment.ts`, which leaves an order at `PROCESSING` until either:
1. The webhook resolves it (`/api/webhooks/datamart/route.ts`), or
2. The fallback sweep (`/api/cron/sweep-pending`) actively polls `GET /orders/:reference`
   if it's been stuck too long - because **DataMart does not retry failed webhook
   deliveries**, so any downtime on our end could otherwise lose that confirmation forever.

## Endpoints

**Place order** — `POST /orders` (requires `X-Idempotency-Key: <uuid>` header)
```json
{ "phoneNumber": "0241234567", "network": "YELLO", "capacity": 5 }
```

**Order status** — `GET /orders/:reference`

**Product catalog + pricing** — `GET /products` (exact response shape not fully documented -
our parsing in `getPackages()` is a best-effort guess, double check after first sync)

**Wallet balance** — `GET /wallet/balance` → use `data.deposit.balance` (what orders spend from;
`data.earnings` is separate storefront revenue, not spendable via this API)

**Customers** — `GET /customers`, `GET /customers/:phone`

## Webhooks
Configure per-key in DataMart's Developer API settings:
`https://yourdomain.com/api/webhooks/datamart`

Events: `order.created`, `order.completed`, `order.failed`, `order.refunded`,
`withdrawal.completed`, `withdrawal.refunded`. Signed with HMAC-SHA256 in the
`X-Webhook-Signature` header, verified against `DATAMART_WEBHOOK_SECRET`.

They expect a response within 8 seconds and do **not retry** failed deliveries -
our webhook handler is deliberately minimal to stay fast.

See `src/lib/supplier.ts` for the typed wrapper used throughout the app.
