"use client";

import { usePathname } from "next/navigation";
import { Megaphone, Users } from "lucide-react";

type Props = {
  href: string;
  label: string;
  icon?: "channel" | "community";
  position?: string;
  color?: "green" | "blue";
  hideOn?: string[]; // paths to hide this button on
};

export default function FloatingJoinButton({ href, label, icon = "channel", position, color = "green", hideOn }: Props) {
  const pathname = usePathname();
  if (!href) return null;
  if (hideOn && pathname && hideOn.some((p) => pathname.startsWith(p))) return null;

  const Icon = icon === "community" ? Users : Megaphone;
  const bg = color === "blue" ? "bg-primary" : "bg-[#25D366]";
  const dotOuter = color === "blue" ? "bg-blue-300" : "bg-green-300";
  const dotInner = color === "blue" ? "bg-blue-400" : "bg-green-400";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed z-40 flex flex-col items-center gap-0.5 ${position || "bottom-4 left-4"}`}
      aria-label={label}
    >
      <span className={`relative flex h-9 w-9 items-center justify-center rounded-full ${bg} text-white shadow-md transition hover:scale-105`}>
        <Icon size={16} />
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotOuter} opacity-75`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotInner} ring-2 ring-white`} />
        </span>
      </span>
      <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-ink shadow-sm">
        {label}
      </span>
    </a>
  );
}