"use client";

import { useEffect, useState } from "react";

// Rotating hero background: fades through the images every 5s behind the hero
// content. Add/remove images in the IMAGES array (files live in /public).
const IMAGES = [
  "/hero-bg.jpg",
  "/hero-bg2.jpg",
  "/hero-bg3.jpg",
  "/hero-bg4.jpg",
  "/hero-bg5.jpg",
  "/hero-bg6.jpg",
  "/hero-bg7.jpg",
];
const INTERVAL = 5000; // 5 seconds

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (IMAGES.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % IMAGES.length), INTERVAL);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url('${src}')`, opacity: i === index ? 1 : 0 }}
        />
      ))}
      {/* dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/65" />
    </div>
  );
}