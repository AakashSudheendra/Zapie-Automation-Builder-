"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, UserCircle } from "lucide-react"
import AppHeader from "@/components/global/app-header"

type User = { id: string; name: string | null; email: string }

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        if (data.ok) setUser(data.user)
      })
      .catch(() => {})
  }, [])

  const name = user?.name?.trim() || "Zappie User"
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen">
      <AppHeader title="Account" />
      <main className="max-w-3xl p-6">
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-xs text-white/40 hover:text-white">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.03]">
          <div className="border-b border-white/10 bg-gradient-to-r from-violet-600/15 to-transparent p-7">
            <div className="flex items-center gap-5">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-violet-600 text-2xl font-bold">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[.2em] text-violet-300">Your account</p>
                <h2 className="mt-1 truncate text-2xl font-bold">{name}</h2>
                <p className="mt-1 truncate text-sm text-white/40">{user?.email || "Loading account…"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Info icon={UserCircle} label="Display name" value={name} />
            <Info icon={Mail} label="Email address" value={user?.email || "Loading…"} />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-white/10 p-6">
            <Link href="/settings" className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold">
              Edit account
            </Link>
            <Link href="/dashboard" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/60 hover:text-white">
              Dashboard
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-white/35">
        <Icon size={16} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-3 truncate text-sm font-medium text-white/80">{value}</p>
    </div>
  )
}
