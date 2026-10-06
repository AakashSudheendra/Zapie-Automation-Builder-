"use client"

import { useEffect, useState } from "react"
import { Check, KeyRound, Link2, Trash2 } from "lucide-react"
import AppHeader from "@/components/global/app-header"
import { loadConnections, toggleConnection, type Connection } from "@/lib/workflow-store"

type CredentialMeta = { id: string; provider: string; label: string }

export default function Connections() {
  const [items, setItems] = useState<Connection[]>([])
  const [credentials, setCredentials] = useState<CredentialMeta[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [secret, setSecret] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setItems(loadConnections())
    fetch("/api/credentials", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        if (data.ok) setCredentials(data.credentials)
      })
      .catch(() => {})
  }, [])

  const connect = async (connection: Connection) => {
    setError("")
    try {
      let parsed: Record<string, string>
      try {
        parsed = JSON.parse(secret)
      } catch {
        parsed = { value: secret }
      }

      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: connection.id, label: connection.name, secret: parsed }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to connect.")
      setCredentials((current) => [...current, data.credential])
      setItems(toggleConnection(connection.id))
      setSecret("")
      setSelected(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect.")
    }
  }

  const disconnect = async (connection: Connection) => {
    const matches = credentials.filter((item) => item.provider === connection.id)
    await Promise.all(matches.map((item) => fetch(`/api/credentials/${item.id}`, { method: "DELETE" })))
    setCredentials((current) => current.filter((item) => item.provider !== connection.id))
    setItems(toggleConnection(connection.id))
  }

  return (
    <div>
      <AppHeader title="Connections" />
      <main className="p-6">
        <div className="mb-6 rounded-2xl border border-white/10 bg-violet-500/5 p-5">
          <div className="flex items-center gap-3">
            <Link2 className="text-violet-300" />
            <div>
              <h2 className="font-semibold">Connect your tools</h2>
              <p className="text-sm text-white/40">Credentials are encrypted server-side and scoped to your workspace.</p>
            </div>
          </div>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((connection) => {
            const connected = credentials.some((credential) => credential.provider === connection.id)
            return (
              <article key={connection.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-sm font-bold">{connection.icon}</div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${connected ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/35"}`}>
                    {connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <h3 className="mt-5 font-semibold">{connection.name}</h3>
                <p className="mt-1 min-h-10 text-sm leading-5 text-white/40">{connection.description}</p>

                {selected === connection.id && !connected ? (
                  <div className="mt-4">
                    <label className="text-xs text-white/40">
                      Credential JSON or secret
                      <textarea value={secret} onChange={(event) => setSecret(event.target.value)} rows={3} placeholder='{"apiKey":"..."}' className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs outline-none focus:border-violet-400/40" />
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => connect(connection)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-semibold"><KeyRound size={14} />Save encrypted</button>
                      <button onClick={() => { setSelected(null); setSecret("") }} className="rounded-xl border border-white/10 px-3 text-xs text-white/50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => connected ? disconnect(connection) : setSelected(connection.id)}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold ${connected ? "border border-red-400/20 bg-red-500/5 text-red-300" : "bg-violet-600 text-white"}`}
                  >
                    {connected ? <><Trash2 size={14} />Disconnect</> : <><KeyRound size={14} />Connect securely</>}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
