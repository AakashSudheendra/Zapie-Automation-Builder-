"use client"

import { useEffect, useState } from "react"
import AppHeader from "@/components/global/app-header"

export default function Settings() {
  const [name, setName] = useState("Zapie User")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const storedName = localStorage.getItem("zapie-profile")
    if (storedName) setName(storedName)
  }, [])

  const handleSave = () => {
    localStorage.setItem("zapie-profile", name.trim() || "Zapie User")
    setName((current) => current.trim() || "Zapie User")
    setSaved(true)
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Settings" />

      <main className="max-w-3xl p-6">
        <section className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-white/40">
            Manage your local workspace profile.
          </p>

          <label className="mt-6 block text-sm text-white/50">
            Display name
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setSaved(false)
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-violet-400/50"
            />
          </label>

          <button
            type="button"
            onClick={handleSave}
            className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold"
          >
            {saved ? "Saved" : "Save changes"}
          </button>
        </section>
      </main>
    </div>
  )
}
