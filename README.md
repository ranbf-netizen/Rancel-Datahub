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

## Gmail-reveal digital products ("GMAIL_LATEST")

A digital product can be set to deliver the **latest email from your own
Gmail**, shown to the buyer for a short timed window (default 60s) after
payment, instead of a static file/link/text. This is for cases where you want
to hand over up-to-date instructions without manually sending them, and
without ever giving anyone real access to your inbox — your server reads one
email and returns only its text.

### One-time setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create/select a project, enable the **Gmail API**.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**, type **Web application**,
   add authorized redirect URI `http://localhost:3000/oauth2callback`.
3. Copy the **Client ID** / **Client secret** into `.env` as `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET`.
4. Run:
   ```bash
   npm install
   node scripts/get-gmail-token.mjs
   ```
   Follow the printed URL, log in with the Gmail account you want read from, approve, paste the
   `code=` value back in. It prints `GMAIL_REFRESH_TOKEN` — add that to `.env` too.
5. **Recommended:** create a Gmail label (e.g. `to-share`) and keep only the current instructions
   email in it. In the admin product form, set "Gmail label" to that label — this is your main
   control over what can ever be shown. Leave it blank and it reveals the single latest email in
   your whole inbox, which is riskier.

### Creating the product

In **Admin → Digital Products → New**, set Delivery to **"Reveal Latest Gmail Email"**, fill in the
Gmail label and how many seconds it should stay visible. That's it — the buy/pay/download flow is
identical to every other digital product (`/api/digital-products/buy` → Paystack → `/downloads?ref=...`).

### How the timing is enforced

The countdown is enforced **server-side**, not just hidden in the browser: the first request to
`/api/digital-products/download` after payment fetches the email, caches its text on the
`DigitalPurchase` row, and stamps `revealStartedAt`. Every request after `gmailRevealSeconds` have
elapsed gets `revealContent: null` back regardless of how many times the page is reloaded — the
reveal cannot be re-triggered by refreshing.

### Security notes

- `GMAIL_CLIENT_SECRET` and `GMAIL_REFRESH_TOKEN` only ever live in server environment variables —
  never sent to the frontend.
- Only the plain-text body of one email is ever returned to a buyer — never your inbox list, sender
  info beyond that email, attachments, or anything else.
- Don't commit `.env`.
