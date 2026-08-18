const NETWORKS = [
  { name: "MTN", color: "bg-mtn", text: "text-[#5c4a00]" },
  { name: "Telecel", color: "bg-telecel", text: "text-white" },
  { name: "AirtelTigo", color: "bg-airteltigo", text: "text-white" },
];

export default function NetworkIllustration() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {NETWORKS.map((n) => (
        <div
          key={n.name}
          className={`group relative overflow-hidden rounded-2xl ${n.color} p-6 transition hover:-translate-y-1 hover:shadow-lg`}
        >
          <p className={`text-sm font-semibold ${n.text}`}>{n.name}</p>
          <div className="mt-6 flex items-end gap-1.5">
            <span className={`h-6 w-2.5 rounded-sm ${n.text === "text-white" ? "bg-white/50" : "bg-ink/30"}`} />
            <span className={`h-9 w-2.5 rounded-sm ${n.text === "text-white" ? "bg-white/70" : "bg-ink/50"}`} />
            <span className={`h-12 w-2.5 rounded-sm ${n.text === "text-white" ? "bg-white" : "bg-ink"}`} />
          </div>
          <p className={`mt-6 text-xs ${n.text === "text-white" ? "text-white/70" : "text-ink/60"}`}>
            Instant delivery
          </p>
        </div>
      ))}
    </div>
  );
}
