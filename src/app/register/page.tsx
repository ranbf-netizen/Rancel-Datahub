"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthBackground from "../components/AuthBackground";
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react";

const CREAM = "#FAF3E0";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-ink/15 px-4 py-3 text-sm text-ink placeholder:text-ink/40 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink/60";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#EEF2F9] px-5 py-16">
      <AuthBackground />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/50 bg-white/30 p-8 shadow-2xl backdrop-blur-2xl">
        <h1 className="text-3xl font-bold text-ink">Create account</h1>
        <p className="mt-1 text-sm text-ink/60">Join RanCel DataHub</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input className={inputClass} style={{ backgroundColor: CREAM }} value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} style={{ backgroundColor: CREAM }} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Phone number</label>
            <input className={inputClass} style={{ backgroundColor: CREAM }} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="0241234567" required />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <input
                className={inputClass + " pr-11"}
                style={{ backgroundColor: CREAM }}
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary inline-flex w-full items-center justify-center gap-2" disabled={loading}>
  {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={16} /> Sign up</>}
</button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}