"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.ok) return
        if (response.status === 401 && pathname !== "/login") {
          router.replace("/login")
          return
        }
        // A missing database during local development should not block the prototype.
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true)
      })

    return () => {
      active = false
    }
  }, [pathname, router])

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-[#070709] text-sm text-white/40">Loading workspace…</div>
  }

  return children
}
