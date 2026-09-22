"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function AdminPinsPage() {
  const [examType, setExamType] = useState("WAEC");
  const [year, setYear] = useState(new Date().getFullYear());
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // Reads an uploaded Excel file (.xlsx/.xls/.csv) and converts the first two
  // columns of the first sheet into "serial_number,pin_code" lines.
  // Expects each row to be: serial number in column A, PIN in column B.
  // A header row (e.g. "Serial, Pin") is auto-detected and skipped.
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const lines: string[] = [];
        for (const row of rows) {
          const serial = String(row[0] ?? "").trim();
          const pin = String(row[1] ?? "").trim();
          if (!serial || !pin) continue;
          // Skip an obvious header row
          if (/serial/i.test(serial) && /pin/i.test(pin)) continue;
          lines.push(`${serial},${pin}`);
        }

        if (lines.length === 0) {
          setParseError("No valid rows found. Column A should be the serial number, column B the PIN.");
          return;
        }
        setCsv(lines.join("\n"));
      } catch {
        setParseError("Couldn't read that file. Make sure it's a valid .xlsx, .xls, or .csv file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/pins/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examType, year, costPrice, sellingPrice, csv }),
    });
    const data = await res.json();
    setLoading(false);
    setResult(data);
    setCsv("");
    setFileName("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Results Checker PINs</h1>
      <p className="mt-2 text-sm text-ink/60">
        Upload the batch of PINs you bought in bulk — either an Excel/CSV file (column A: serial
        number, column B: PIN) or paste the pairs manually below.
      </p>

      <form onSubmit={handleUpload} className="card mt-6 max-w-lg space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Exam type</label>
            <select className="field" value={examType} onChange={(e) => setExamType(e.target.value)}>
              <option>WAEC</option>
              <option>BECE</option>
              <option>NOVDCE</option>
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <input className="field" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Cost price (GH₵ per PIN)</label>
            <input className="field" type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
          </div>
          <div>
            <label className="label">Selling price (GH₵ per PIN)</label>
            <input className="field" type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label">Upload Excel / CSV file</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-md file:border-0 file:bg-moss file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper hover:file:bg-[#173d2e]"
          />
          {fileName && <p className="mt-1 text-xs text-ink/50">Loaded: {fileName}</p>}
          {parseError && <p className="mt-1 text-xs text-red-600">{parseError}</p>}
        </div>

        <div>
          <label className="label">Or paste serial + PIN pairs manually</label>
          <textarea
            className="field h-32 font-mono"
            placeholder={"WRD123456,4829-1938-2039\nWRD123457,4829-1938-2040"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          {csv && <p className="mt-1 text-xs text-ink/50">{csv.split("\n").filter(Boolean).length} rows ready to upload</p>}
        </div>

        <button className="btn-primary w-full" disabled={loading || !csv}>
          {loading ? "Uploading…" : "Upload batch"}
        </button>
      </form>

      {result && (
        <p className="mt-4 text-sm">
          Added <span className="font-semibold text-moss">{result.added}</span> PINs,
          skipped <span className="font-semibold text-clay">{result.skipped}</span> (duplicates or malformed rows).
        </p>
      )}
    </div>
  );
}
