"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BookTemplate, CreditCard, LayoutDashboard, Link2, LogOut, Settings, Workflow } from "lucide-react";

const links = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Workflows", "/workflows", Workflow],
  ["Connections", "/connections", Link2],
  ["Templates", "/templates", BookTemplate],
  ["Logs", "/logs", Activity],
  ["Billing", "/billing", CreditCard],
  ["Settings", "/settings", Settings],
] as const;

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className="hidden w-20 shrink-0 border-r border-white/10 bg-black md:flex md:flex-col md:items-center md:gap-7 md:py-6">
      <Link href="/" className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-600 text-lg font-black shadow-lg shadow-violet-900/30">Z</Link>
      <nav className="flex flex-1 flex-col gap-3">
        {links.map(([name, href, Icon]) => (
          <Link title={name} key={href} href={href} className={`grid h-11 w-11 place-items-center rounded-xl transition ${path.startsWith(href) ? "bg-violet-500/20 text-violet-300" : "text-white/45 hover:bg-white/5 hover:text-white"}`}>
            <Icon size={19} />
          </Link>
        ))}
      </nav>
      <button title="Sign out" onClick={logout} className="grid h-11 w-11 place-items-center rounded-xl text-white/35 hover:bg-red-500/10 hover:text-red-300">
        <LogOut size={18} />
      </button>
    </aside>
  );
}
