// On-brand SVG graphic for the Social Media Boosting shop card (no stock photo).
export default function BoostingGraphic() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#bg)" />
      {/* upward trend line */}
      <polyline points="40,240 120,190 190,210 260,120 340,70" fill="none" stroke="#FFCC08" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="340" cy="70" r="9" fill="#FFCC08" />
      {/* platform dots */}
      <circle cx="90" cy="90" r="26" fill="#ffffff" opacity="0.12" />
      <circle cx="300" cy="220" r="20" fill="#ffffff" opacity="0.12" />
      <circle cx="180" cy="60" r="14" fill="#ffffff" opacity="0.12" />
      <text x="200" y="160" textAnchor="middle" fill="#ffffff" fontSize="26" fontWeight="700" fontFamily="sans-serif">Boost</text>
      <text x="200" y="188" textAnchor="middle" fill="#ffffff" fontSize="13" opacity="0.8" fontFamily="sans-serif">Followers · Likes · Views</text>
    </svg>
  );
}
