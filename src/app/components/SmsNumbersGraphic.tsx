// On-brand SVG graphic for the SMS Numbers shop card (no stock photo) -
// same gradient/shape language as BoostingGraphic, so the two feature
// cards feel like a matched pair.
export default function SmsNumbersGraphic() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sms-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sms-bg)" />

      {/* soft background shapes, matching BoostingGraphic's dot language */}
      <circle cx="330" cy="80" r="26" fill="#ffffff" opacity="0.12" />
      <circle cx="70" cy="230" r="20" fill="#ffffff" opacity="0.12" />
      <circle cx="60" cy="70" r="14" fill="#ffffff" opacity="0.12" />

      {/* phone outline */}
      <rect x="150" y="70" width="100" height="170" rx="16" fill="#ffffff" opacity="0.14" />
      <rect x="164" y="86" width="72" height="128" rx="6" fill="#0F172A" opacity="0.55" />
      <rect x="186" y="222" width="28" height="6" rx="3" fill="#ffffff" opacity="0.5" />

      {/* incoming message bubble with a code, tucked over the phone's top-right corner */}
      <rect x="205" y="55" width="110" height="46" rx="12" fill="#FFCC08" />
      <polygon points="220,101 232,101 220,113" fill="#FFCC08" />
      <text x="260" y="84" textAnchor="middle" fill="#0F172A" fontSize="20" fontWeight="700" fontFamily="monospace" letterSpacing="2">482 913</text>

      <text x="200" y="270" textAnchor="middle" fill="#ffffff" fontSize="13" opacity="0.8" fontFamily="sans-serif">WhatsApp · Google · Telegram &amp; more</text>
    </svg>
  );
}
