"use client";

import { useRef } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";

export type Testimonial = {
  quote: string;
  name: string;
  location: string;
  photoUrl?: string; // optional real photo (e.g. a Cloudinary URL)
};

// Manual testimonial slider: swipe on touch, or use the arrows on desktop.
// No auto-motion, so quotes stay readable. Add/replace items in TESTIMONIALS
// on the homepage.
export default function TestimonialSlider({ items }: { items: Testimonial[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  function scrollBy(dir: number) {
    const el = scroller.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="mt-8">
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((t, i) => (
          <div key={i} className="w-[85%] shrink-0 snap-start sm:w-[45%] lg:w-[31%]">
            <div className="card h-full">
              <Quote size={20} className="text-primary/40" />
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{t.quote}</p>
              <div className="mt-4">
                <span className="block text-sm font-semibold text-ink">{t.name}</span>
                <span className="block text-xs text-slate">{t.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button onClick={() => scrollBy(-1)} aria-label="Previous" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 hover:bg-mist">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => scrollBy(1)} aria-label="Next" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 hover:bg-mist">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
