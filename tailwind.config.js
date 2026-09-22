/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",     // solid charcoal-navy, primary text + dark section bg
        paper: "#FFFFFF",   // page background
        primary: "#2563EB", // single solid brand blue - buttons, links, active states
        mist: "#F1F5F9",    // light section/card background
        slate: "#64748B",   // muted secondary text
        border: "#E2E8F0",  // standard border color

        // Real network brand colors, used deliberately (network dots, tabs, accents)
        mtn: "#FFCC08",
        telecel: "#E4032E",
        airteltigo: "#0033A0",

        // Ghana flag accent - used sparingly (footer only)
        ghRed: "#CE1126",
        ghGold: "#FCD116",
        ghGreen: "#006B3F",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
