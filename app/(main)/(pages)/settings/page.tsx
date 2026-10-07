"use client"

import { useEffect, useState } from "react"
import AppHeader from "@/components/global/app-header"

type User = { id: string; name: string | null; email: string }

export default function Settings() {
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Unable to load profile.")
        setUser(data.user)
        setName(data.user.name || "")
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load profile."))
  }, [])

  const handleSave = async () => {
    setSaved(false)
    setError("")
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to save profile.")
      setUser(data.user)
      setName(data.user.name || "")
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.")
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Settings" />
      <main className="max-w-3xl p-6">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-white/40">Manage your account profile stored in your Zappie workspace.</p>

          {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}

          <label className="mt-6 block text-sm text-white/50">
            Display name
            <input
              value={name}
              onChange={(event) => { setName(event.target.value); setSaved(false) }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-violet-400/50"
              placeholder="Your name"
            />
          </label>

          <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3 text-sm text-white/40">
            Email: <span className="text-white/70">{user?.email || "Loading…"}</span>
          </div>

          <button type="button" onClick={handleSave} className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold">
            {saved ? "Saved" : "Save changes"}
          </button>
        </section>
      </main>
    </div>
  )
}
