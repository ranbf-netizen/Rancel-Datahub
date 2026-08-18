import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 md:flex-row">
      <aside className="flex gap-1 overflow-x-auto text-sm md:w-48 md:shrink-0 md:flex-col md:overflow-visible">
        <Link href="/admin" className="whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist">Overview</Link>
        <Link href="/admin/bundles" className="whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist">Data Bundles</Link>
        <Link href="/admin/pins" className="whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist">Results PINs</Link>
        <Link href="/admin/orders" className="whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist">Orders</Link>
        <Link href="/admin/agents" className="whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist">Agents</Link>
        <Link href="/admin/announcements" className="whitespace-nowrap rounded-md px-3 py-2 hover:bg-mist">Updates</Link>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
