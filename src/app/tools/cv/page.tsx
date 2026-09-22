"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Download, Copy, Check } from "lucide-react";
import { jsPDF } from "jspdf";

export default function CvTool() {
  const [form, setForm] = useState({ name: "", contact: "", experience: "", education: "", skills: "" });
  const [cv, setCv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function update(key: string, value: string) { setForm({ ...form, [key]: value }); }

  async function generate() {
    setError(""); setCv(""); setCopied(false); setLoading(true);
    try {
      const res = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "AUTH") { window.location.href = "/register"; return; }
      if (res.status === 402 || data.error === "NO_CREDITS") { setError("You're out of credits. Buy more from any AI tool."); }
      else if (!res.ok) setError(data.error || "Failed.");
      else setCv(data.result);
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  }

  function render(text: string) {
    return text.split("\n").map((line, i) => {
      const t = line.trim();
      if (!t || /^[-=]{3,}$/.test(t)) return <div key={i} className="h-3" />;
      if (/^#{1,6}\s+/.test(t))
        return <h2 key={i} className="mt-3 mb-1 text-base font-bold uppercase tracking-wide text-ink">{t.replace(/^#{1,6}\s+/, "")}</h2>;
      const html = t.replace(/^\*\s+/, "• ").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
      return <p key={i} className="text-sm leading-relaxed text-ink/80" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }

  function downloadPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;
    cv.split("\n").forEach((raw) => {
      const line = raw.trim();
      if (!line || /^[-=]{3,}$/.test(line)) { y += 8; return; }
      const isHeading = /^#{1,6}\s+/.test(line);
      const clean = line.replace(/^#{1,6}\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/^\*\s+/, "• ");
      doc.setFont("helvetica", isHeading ? "bold" : "normal");
      doc.setFontSize(isHeading ? 12 : 10);
      const wrapped = doc.splitTextToSize(clean || " ", width);
      wrapped.forEach((w: string) => {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
        doc.text(w, margin, y);
        y += isHeading ? 18 : 14;
      });
    });
    doc.save(`${form.name || "cv"}.pdf`);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/tools" className="text-sm text-primary hover:underline">← All AI tools</Link>
      <h1 className="mt-2 text-3xl font-bold">AI CV Assistant</h1>
      <p className="mt-1 text-slate">Fill in your details and generate a professional CV.</p>

      <div className="card mt-6 space-y-4">
        <div><label className="label">Full name</label><input className="field" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
        <div><label className="label">Contact (phone / email)</label><input className="field" value={form.contact} onChange={(e) => update("contact", e.target.value)} /></div>
        <div><label className="label">Work experience</label><textarea className="field" rows={3} value={form.experience} onChange={(e) => update("experience", e.target.value)} /></div>
        <div><label className="label">Education</label><textarea className="field" rows={2} value={form.education} onChange={(e) => update("education", e.target.value)} /></div>
        <div><label className="label">Skills</label><textarea className="field" rows={2} value={form.skills} onChange={(e) => update("skills", e.target.value)} /></div>

        {error && <p className="text-sm text-ghRed">{error}</p>}

        <button onClick={generate} disabled={loading} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Generating…" : "Generate CV"}
        </button>
      </div>

      {cv && (
        <div className="card mt-6">
          <div className="space-y-0.5">{render(cv)}</div>
          <div className="mt-4 flex gap-2 border-t border-ink/10 pt-3">
            <button onClick={downloadPdf} className="btn-primary inline-flex items-center gap-2 !py-1.5 !text-sm"><Download size={14} /> Download PDF</button>
            <button onClick={() => { navigator.clipboard.writeText(cv); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn-secondary inline-flex items-center gap-2 !py-1.5 !text-sm">
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy text"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
