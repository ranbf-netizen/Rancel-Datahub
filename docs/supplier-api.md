# mydatagigs.com API (data bundle supplier)

Get an API key at: https://mydatagigs.com/my-account/api-access/

**Important:** mydatagigs.com requires *their* wallet (yours, on their platform) to be funded
before any order can be placed. This is separate from customer payments, which flow through
Paystack into your bank account. See admin dashboard → Overview for a live balance check.

## Auth
`Authorization: Bearer YOUR_API_KEY`

## Networks
`mtn`, `telecel`, `at_bigdata`, `at_ishare`

## Endpoints

**Place order** — `POST /wp-json/custom/v1/place-order`
```json
{ "network": "mtn", "beneficiary": "0241234567", "pa_data-bundle-packages": 2 }
```

**Wallet balance** — `GET /wp-json/custom/v1/wallet-balance`

**Order status** — `GET /wp-json/custom/v1/order-status?order_id=1685487`

**Packages (catalog + cost prices)** — `GET /wp-json/custom/v1/packages?network=mtn`

See `src/lib/supplier.ts` for the typed wrapper used throughout the app.
