// Lively animated background for the login / register pages: colourful floating
// bubbles that rise and drift. Pure CSS animations (no JS loop), so it stays
// smooth and battery-friendly on low-end phones. Sits behind the form.

const BUBBLES = [
  { left: "8%",  size: 46, color: "bg-mtn/40",       delay: "0s",   dur: "13s" },
  { left: "20%", size: 26, color: "bg-primary/40",   delay: "-4s",  dur: "17s" },
  { left: "33%", size: 64, color: "bg-telecel/30",   delay: "-8s",  dur: "15s" },
  { left: "45%", size: 20, color: "bg-airteltigo/40",delay: "-2s",  dur: "19s" },
  { left: "57%", size: 52, color: "bg-primary/30",   delay: "-11s", dur: "14s" },
  { left: "68%", size: 30, color: "bg-mtn/40",       delay: "-6s",  dur: "18s" },
  { left: "80%", size: 40, color: "bg-telecel/30",   delay: "-9s",  dur: "16s" },
  { left: "90%", size: 24, color: "bg-airteltigo/40",delay: "-3s",  dur: "20s" },
  { left: "14%", size: 34, color: "bg-primary/30",   delay: "-13s", dur: "21s" },
  { left: "74%", size: 58, color: "bg-mtn/30",       delay: "-7s",  dur: "15s" },
];

export default function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* soft moving colour wash behind the bubbles */}
      <div className="animate-auth-gradient absolute inset-0 opacity-70" />
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className={`animate-auth-bubble absolute bottom-[-80px] rounded-full ${b.color} blur-[1px]`}
          style={{ left: b.left, width: b.size, height: b.size, animationDelay: b.delay, animationDuration: b.dur }}
        />
      ))}
    </div>
  );
}
