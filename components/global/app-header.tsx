"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, ChevronDown, LogOut, Search, Settings, UserCircle } from "lucide-react"
import { useRouter } from "next/navigation"

type User = { id: string; name: string | null; email: string }

export default function AppHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        if (data.ok) setUser(data.user)
      })
      .catch(() => {})

    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const logout = async () => {
    setOpen(false)
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  const displayName = user?.name?.trim() || "Zappie User"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[.2em] text-violet-300">Workspace</p>
        <h1 className="truncate text-xl font-bold sm:text-2xl">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50 sm:flex">
          <Search size={14} />Search
        </button>

        {action}

        <Link
          href="/"
          title="Open public site"
          className="hidden h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 hover:text-white sm:grid"
        >
          <ArrowUpRight size={17} />
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-2.5 hover:bg-white/[.08]"
            aria-label="Open account menu"
            aria-expanded={open}
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-xs font-bold text-white">
              {initial}
            </span>
            <span className="hidden max-w-28 text-left sm:block">
              <span className="block truncate text-xs font-semibold text-white/80">{displayName}</span>
              <span className="block truncate text-[10px] text-white/35">{user?.email || "Account"}</span>
            </span>
            <ChevronDown size={14} className={open ? "rotate-180 text-white/60" : "text-white/35"} />
          </button>

          {open && (
            <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#111114] p-2 shadow-2xl shadow-black/50">
              <div className="border-b border-white/10 px-3 py-3">
                <p className="text-xs font-semibold text-white/80">{displayName}</p>
                <p className="mt-1 truncate text-[11px] text-white/35">{user?.email || "Signed in account"}</p>
              </div>

              <div className="mt-1 space-y-1">
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <UserCircle size={16} />
                  Account
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-red-300/80 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
