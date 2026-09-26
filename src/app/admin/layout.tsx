import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LayoutDashboard, BarChart3, Package, Ticket, ShoppingBag, ShoppingCart, ClipboardList, Users, Banknote, Sprout, Megaphone, Rocket, Smartphone } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 md:flex-row">
      <aside className="flex gap-1 overflow-x-auto text-sm md:w-48 md:shrink-0 md:flex-col md:overflow-visible">
        <Link href="/admin" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><LayoutDashboard size={16} /> Overview</Link>
        <Link href="/admin/analytics" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><BarChart3 size={16} /> Analytics</Link>
        <Link href="/admin/bundles" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><Package size={16} /> Data Bundles</Link>
        {/*<Link href="/admin/pins" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><Ticket size={16} /> Results PINs</Link>*/}
        <Link href="/admin/digital-products" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><ShoppingBag size={16} /> Shop Products</Link>
        <Link href="/admin/boosting" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><Rocket size={16} /> Boosting</Link>
        <Link href="/admin/sms-numbers" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><Smartphone size={16} /> SMS Numbers</Link>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><ShoppingCart size={16} /> Orders</Link>
        <Link href="/admin/shop-orders" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><ClipboardList size={16} /> Shop Orders</Link>
        <Link href="/admin/agents" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><Users size={16} /> Agents</Link>
        <Link href="/admin/withdrawals" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><Banknote size={16} /> Withdrawals</Link>
        <Link href="/admin/afa" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><Sprout size={16} /> AFA</Link>
        <Link href="/admin/announcements" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist"><Megaphone size={16} /> Updates</Link>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}