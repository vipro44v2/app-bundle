"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const navBase =
  "flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-[#5c5f62] no-underline transition-colors hover:bg-green-50 hover:text-green-700";

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => setEmbedded(window.top !== window.self), []);

  return (
    <div className="min-h-screen max-w-full overflow-x-clip bg-[#f6f6f7] text-[#202223]">
      <button
        aria-label="Close navigation"
        className={`fixed inset-0 z-40 bg-slate-950/45 md:hidden ${menu ? "block" : "hidden"}`}
        onClick={() => setMenu(false)}
      />
      <aside
        className={`${embedded ? "hidden" : "flex"} fixed inset-y-0 left-0 z-50 w-[232px] flex-col border-r border-[#ebebeb] bg-white px-3 py-[18px] transition-transform md:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[38px] items-center justify-between px-[7px]">
          <div className="flex items-center gap-2.5 text-[15px] font-bold tracking-[-0.25px] text-[#171717]">
            <span className="grid size-8 place-items-center rounded-[9px] bg-[#171717] text-[17px] font-extrabold text-white shadow-[inset_0_-2px_0_rgba(255,255,255,.1)]">
              TS
            </span>
            <span>
              Thanh Sang <b className="font-bold text-green-600">Bundle</b>
            </span>
          </div>
          <button
            className="grid size-9 place-items-center rounded-lg text-[#5b6861] hover:bg-gray-100 md:hidden"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
          >
            <X className="block" size={20} />
          </button>
        </div>
        <div className="my-[18px] flex items-center gap-2 rounded-[10px] border border-[#e7e7e7] bg-[#fafafa] p-2 shadow-sm">
          <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-green-100 font-bold text-green-700">
            N
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-xs">Shopify Store</strong>
            <span className="mt-0.5 block truncate text-[10px] text-[#6d7175]">
              Connected merchant
            </span>
          </div>
          <ChevronDown className="block shrink-0" size={16} />
        </div>
        <nav className="flex flex-col gap-1">
          <Link
            className={`${navBase} ${pathname === "/dashboard" ? "bg-green-50 font-semibold text-green-700 shadow-[inset_3px_0_0_#16a34a]" : ""}`}
            href="/dashboard"
            onClick={() => setMenu(false)}
          >
            <LayoutDashboard className="block shrink-0" size={19} />
            Home
          </Link>
          <Link
            className={`${navBase} ${pathname.startsWith("/bundles") ? "bg-green-50 font-semibold text-green-700 shadow-[inset_3px_0_0_#16a34a]" : ""}`}
            href="/bundles"
            onClick={() => setMenu(false)}
          >
            <Package className="block shrink-0" size={19} />
            Bundle deals
          </Link>
          <Link
            className={`${navBase} ${pathname.startsWith("/settings") ? "bg-green-50 font-semibold text-green-700 shadow-[inset_3px_0_0_#16a34a]" : ""}`}
            href="/settings"
            onClick={() => setMenu(false)}
          >
            <Settings className="block shrink-0" size={19} />
            Settings
          </Link>
        </nav>
        <div className="mt-auto">
          <button
            className={`${navBase} w-full border-0 bg-transparent text-left`}
          >
            <CircleHelp className="block shrink-0" size={19} />
            Help center
          </button>
        </div>
      </aside>
      <main className={`min-w-0 ${embedded ? "ml-0" : "md:ml-[232px]"}`}>
        <header
          className={`${embedded ? "hidden" : "sticky"} top-0 z-20 flex h-[62px] items-center gap-2 border-b border-[#ebebeb] bg-white/95 px-3.5 backdrop-blur md:px-7`}
        >
          <button
            className="grid size-9 place-items-center rounded-lg text-[#5b6861] hover:bg-gray-100 md:hidden"
            onClick={() => setMenu(true)}
            aria-label="Open navigation"
          >
            <Menu className="block" size={21} />
          </button>
          <div className="flex h-9 max-w-[460px] flex-1 items-center gap-2 rounded-lg border border-[#d8dadd] bg-[#fafafa] px-2.5 text-[#78847d]">
            <Search className="block shrink-0" size={18} />
            <input
              className="min-w-0 flex-1 border-0 bg-transparent outline-none"
              placeholder="Search Thanh Sang Bundle"
            />
            <kbd className="whitespace-nowrap rounded border border-[#e1e3e5] bg-[#f1f2f3] px-1.5 py-0.5 text-[10px] max-sm:hidden">
              ⌘ K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              className="relative grid size-9 place-items-center rounded-lg text-[#5b6861] hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell className="block" size={19} />
              <i className="absolute right-1.5 top-1.5 size-[5px] rounded-full bg-red-500" />
            </button>
            <button className="grid size-8 place-items-center rounded-lg border-0 bg-green-100 font-bold text-green-700">
              JD
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
