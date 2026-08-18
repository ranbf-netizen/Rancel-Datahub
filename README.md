# Rancel DataHub

Data bundle reseller + WAEC/BECE results checker PIN storefront, with an admin dashboard.
Payment is per-order via Paystack (no customer wallet).

## Stack
Next.js 14 (App Router) · PostgreSQL + Prisma · Paystack · mydatagigs.com data supplier API

## 1. Install
```bash
npm install
```

## 2. Set up environment variables
```bash
cp .env.example .env
```
Fill in:
- `DATABASE_URL` — your Postgres connection string (Supabase/Neon/Railway all work)
- `JWT_SECRET` — any long random string
- `SUPPLIER_API_KEY` — from https://mydatagigs.com/my-account/api-access/
- `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` — leave blank until ready; the app runs fine
  without them, it just can't take real payments (checkout will show a clear "not configured" message)

## 3. Set up the database
```bash
npm run db:push
```

## 4. Create your first admin user
Sign up normally through the site, then promote yourself to admin directly in the database
(Prisma Studio is the easiest way):
```bash
npm run db:studio
```
Open the `User` table, find your account, set `role` to `ADMIN`.

## 5. Run it
```bash
npm run dev
```
Visit http://localhost:3000

## 6. First-time admin setup
1. Log in as your admin account, go to **/admin**
2. Go to **Data Bundles → Sync catalog from supplier** to pull in mydatagigs.com's current
   packages and prices. Default markup is 10% — adjust the "Selling price" column per bundle.
3. Go to **Results PINs** and upload your first batch of PINs (serial + PIN pairs, one per line).
4. Once you have your Paystack keys, add them to `.env` and configure the webhook URL in your
   Paystack dashboard: `https://yourdomain.com/api/paystack/webhook`

## Notes
- `docs/supplier-api.md` has the raw mydatagigs.com API reference.
- The mydatagigs.com wallet (visible on the admin Overview page) is **your** balance on their
  platform — separate from customer payments. Keep it funded or paid customer orders will fail
  to fulfill (they'll be flagged for refund automatically in that case).
- See the root of the repo for `.env.example` — never commit a real `.env` file.

## Automated pending-order resolution
Orders can get stuck showing "Pending" if Paystack's webhook never arrives (dropped connection,
customer closes the tab mid-payment, etc). Three layers close this gap:
1. **Webhook** — resolves the order the instant Paystack confirms payment (automatic, no delay).
2. **Return-to-site check** — when the customer lands back on `/orders` after checkout, the app
   actively re-checks that specific payment with Paystack (automatic).
3. **Background sweep** — a scheduled job (`/api/cron/sweep-pending`) runs every 5 minutes and
   resolves *any* order still Pending after 10 minutes, catching cases where a customer never
   returns to the site at all. Fully automatic once deployed — see below.

**To activate the sweep once deployed:**
Vercel's free (Hobby) plan only allows cron jobs that run once per day, not every few minutes.
`vercel.json` is set to run the sweep once daily (3am) as a safety net — that alone is too slow
to be the main fix, so pair it with a free external scheduler for real-time coverage:

1. Sign up free at cron-job.org (or any similar service).
2. Create a job that calls `GET https://yourdomain.com/api/cron/sweep-pending` every 5 minutes.
3. Add a custom header: `Authorization: Bearer <your CRON_SECRET>` (same value as set in Vercel).
4. In Vercel's project settings, add an environment variable `CRON_SECRET` set to a long random
   string (must match the value used in the header above).

If you later upgrade to Vercel Pro, you can instead change `vercel.json`'s schedule back to
`*/5 * * * *` and drop the external scheduler entirely.

Admin can still manually trigger a check anytime via the "Check now" button on the Orders page —
useful for resolving a specific order immediately rather than waiting for the next sweep.
