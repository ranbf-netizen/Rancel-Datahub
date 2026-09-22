import { Loader2 } from "lucide-react";

// Reusable loading spinner (real SVG icon, matches the site). Drop into buttons
// or beside loading text for a consistent, polished feel.
export default function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />;
}
