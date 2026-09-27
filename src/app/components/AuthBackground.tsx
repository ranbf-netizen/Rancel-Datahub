// Animated bubble background for login/register. Styles are inlined here so they
// work regardless of how globals.css compiles.

const BUBBLES = [
  { left: "8%",  size: 46, color: "rgba(255,204,8,0.40)",  delay: "0s",   dur: "13s" },
  { left: "20%", size: 26, color: "rgba(37,99,235,0.40)",  delay: "-4s",  dur: "17s" },
  { left: "33%", size: 64, color: "rgba(228,3,46,0.30)",   delay: "-8s",  dur: "15s" },
  { left: "45%", size: 20, color: "rgba(0,51,160,0.40)",   delay: "-2s",  dur: "19s" },
  { left: "57%", size: 52, color: "rgba(37,99,235,0.30)",  delay: "-11s", dur: "14s" },
  { left: "68%", size: 30, color: "rgba(255,204,8,0.40)",  delay: "-6s",  dur: "18s" },
  { left: "80%", size: 40, color: "rgba(228,3,46,0.30)",   delay: "-9s",  dur: "16s" },
  { left: "90%", size: 24, color: "rgba(0,51,160,0.40)",   delay: "-3s",  dur: "20s" },
  { left: "14%", size: 34, color: "rgba(37,99,235,0.30)",  delay: "-13s", dur: "21s" },
  { left: "74%", size: 58, color: "rgba(255,204,8,0.30)",  delay: "-7s",  dur: "15s" },
];

export default function AuthBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`
        @keyframes rdh-bubble {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          50%  { transform: translateY(-55vh) translateX(24px) scale(1.15); }
          90%  { opacity: 1; }
          100% { transform: translateY(-105vh) translateX(-24px) scale(0.9); opacity: 0; }
        }
      `}</style>
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            bottom: "-80px",
            left: b.left,
            width: b.size,
            height: b.size,
            borderRadius: "9999px",
            background: b.color,
            filter: "blur(1px)",
            animation: `rdh-bubble ${b.dur} ease-in-out infinite`,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  );
}
