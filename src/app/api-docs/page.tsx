import Link from "next/link";
import { Zap, Wallet, KeyRound, Code2 } from "lucide-react";

export const metadata = {
  title: "Reseller API — RanCel DataHub",
  description: "Sell data bundles and AFA registrations from your own website or app using the RanCel DataHub reseller API.",
};

function Endpoint({ method, path, desc, body, example }: { method: string; path: string; desc: string; body?: string; example: string }) {
  const methodColor = method === "GET" ? "bg-primary/10 text-primary" : "bg-mtn/20 text-[#8A6D00]";
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${methodColor}`}>{method}</span>
        <code className="text-sm font-semibold text-ink">{path}</code>
      </div>
      <p className="mt-2 text-sm text-slate">{desc}</p>
      {body && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate">Body</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-white">{body}</pre>
        </>
      )}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate">Example</p>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-white">{example}</pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-ink">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center md:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-mtn">Reseller API</p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Sell data from your own platform</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Build your own website or app with our API. Sell data bundles and AFA
            registrations at reseller cost, set your own prices, and keep the difference.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/agents" className="btn-primary">Become a reseller</Link>
            <Link href="/agent" className="btn-ghost-light">Go to dashboard</Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Step icon={<KeyRound size={20} />} n="1" title="Become an agent" desc="Sign up and get approved as a reseller (agent)." />
          <Step icon={<Wallet size={20} />} n="2" title="Top up your wallet" desc="Load funds via Paystack — orders are billed from this balance." />
          <Step icon={<Code2 size={20} />} n="3" title="Generate an API key" desc="Create your key from your agent dashboard." />
          <Step icon={<Zap size={20} />} n="4" title="Start selling" desc="Call the API from your own site and set your own prices." />
        </div>
      </section>

      {/* Auth */}
      <section className="mx-auto max-w-4xl px-5 pb-8">
        <h2 className="text-2xl font-bold">Authentication</h2>
        <p className="mt-2 text-sm text-slate">
          Every request must include your API key in the <code>Authorization</code> header. Generate
          your key from your <Link href="/agent" className="text-primary hover:underline">agent dashboard</Link> → API Access.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-white">Authorization: Bearer YOUR_API_KEY</pre>
        <p className="mt-2 text-xs text-ghRed">Keep your key secret — anyone with it can place orders billed to your wallet.</p>
      </section>

      {/* Endpoints */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <h2 className="text-2xl font-bold">Endpoints</h2>
        <p className="mt-1 text-sm text-slate">Base URL: <code>https://www.ranceldatahub.shop</code></p>

        <div className="mt-6 space-y-4">
          <Endpoint
            method="GET"
            path="/api/v1/bundles"
            desc="List all available data bundles at your reseller price. Call this any time to sync current pricing."
            example={`curl "https://www.ranceldatahub.shop/api/v1/bundles" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/balance"
            desc="Check your wallet balance (in GHS)."
            example={`curl "https://www.ranceldatahub.shop/api/v1/balance" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/order"
            desc="Place a data bundle order. The reseller cost is deducted from your wallet. Returns the order id and status."
            body={`{
  "bundleId": "the bundle id from /api/v1/bundles",
  "recipient": "0241234567"
}`}
            example={`curl -X POST "https://www.ranceldatahub.shop/api/v1/order" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"bundleId":"BUNDLE_ID","recipient":"0241234567"}'`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/order/{id}"
            desc="Check the status of an order you placed (processing, delivered, or failed)."
            example={`curl "https://www.ranceldatahub.shop/api/v1/order/ORDER_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/afa"
            desc="Submit an AFA registration. The AFA price is deducted from your wallet."
            body={`{
  "fullName": "Ama Boateng",
  "phoneNumber": "0241234567",
  "idNumber": "GHA-XXXXXXXXX-X",
  "dateOfBirth": "1995-06-12",
  "town": "Kumasi",
  "occupation": "Trader",
  "region": "Ashanti",
  "cropProduce": "Maize (optional)"
}`}
            example={`curl -X POST "https://www.ranceldatahub.shop/api/v1/afa" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"fullName":"Ama Boateng","phoneNumber":"0241234567","idNumber":"GHA-XXX","dateOfBirth":"1995-06-12","town":"Kumasi","occupation":"Trader","region":"Ashanti"}'`}
          />
        </div>

        {/* Notes */}
        <div className="card mt-8 bg-mist">
          <h3 className="font-semibold">Good to know</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-slate">
            <li>• Orders are billed at <strong>reseller cost</strong> from your top-up wallet. You set your own selling price to your customers.</li>
            <li>• If an order can&rsquo;t be placed, your wallet is <strong>automatically refunded</strong> — you&rsquo;re never charged for a failed order.</li>
            <li>• Keep your wallet funded, or orders will return a <code>402 Insufficient balance</code> error.</li>
            <li>• Prices update automatically — re-fetch <code>/api/v1/bundles</code> to stay in sync.</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <Link href="/agents" className="btn-primary">Become a reseller — get your API key</Link>
        </div>
      </section>
    </div>
  );
}

function Step({ icon, n, title, desc }: { icon: React.ReactNode; n: string; title: string; desc: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <span className="text-xs font-bold text-slate">STEP {n}</span>
      </div>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-slate">{desc}</p>
    </div>
  );
}
