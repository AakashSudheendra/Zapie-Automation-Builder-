"use client"

import { useEffect, useState } from "react"
import AppHeader from "@/components/global/app-header"
import { Check, Loader2 } from "lucide-react"

type Plan = { id: string; name: string; price: number; workflows: number; runs: number; integrations: string }

export default function Billing() {
  const [plan, setPlan] = useState("FREE")
  const [plans, setPlans] = useState<Plan[]>([])
  const [usage, setUsage] = useState({ runs: 0, periodEnd: "" })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState("")

  useEffect(() => {
    fetch("/api/billing", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Unable to load billing.")
        setPlan(data.plan)
        setPlans(data.availablePlans)
        setUsage({ runs: data.usage.runs, periodEnd: data.usage.periodEnd })
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load billing."))
  }, [])

  const choose = async (next: string) => {
    setSaving(next)
    setError("")
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: next }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to update plan.")
      setPlan(data.plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update plan.")
    } finally {
      setSaving("")
    }
  }

  return (
    <div>
      <AppHeader title="Billing" />
      <main className="p-6">
        <section className="mb-7 rounded-2xl border border-white/10 bg-violet-500/5 p-6">
          <p className="text-sm text-violet-300">Current plan</p>
          <h2 className="mt-2 text-3xl font-bold">{plans.find((item) => item.id === plan)?.name || plan}</h2>
          <p className="mt-1 text-sm text-white/40">Plan and usage are stored per workspace.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <p className="text-xs text-white/35">Runs this period</p>
              <p className="mt-1 text-xl font-bold">{usage.runs}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <p className="text-xs text-white/35">Period resets</p>
              <p className="mt-1 text-sm font-semibold">{usage.periodEnd ? new Date(usage.periodEnd).toLocaleDateString() : "—"}</p>
            </div>
          </div>
        </section>

        {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <article key={p.id} className={`rounded-2xl border p-6 ${plan === p.id ? "border-violet-400/40 bg-violet-500/10" : "border-white/10 bg-white/[.03]"}`}>
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-3 text-4xl font-bold">₹{p.price.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-white/30">{p.price ? "per month" : "forever"}</p>
              <ul className="my-6 space-y-3">
                <Feature>{p.workflows < 0 ? "Unlimited workflows" : `${p.workflows} workflows`}</Feature>
                <Feature>{p.runs < 0 ? "Unlimited runs" : `${p.runs.toLocaleString()} runs / month`}</Feature>
                <Feature>{p.integrations}</Feature>
              </ul>
              <button onClick={() => choose(p.id)} disabled={plan === p.id || Boolean(saving)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-black disabled:opacity-50">
                {saving === p.id && <Loader2 size={14} className="animate-spin" />}
                {plan === p.id ? "Current plan" : "Select plan"}
              </button>
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs text-white/25">Payment-provider checkout is not connected yet; selecting a plan persists the workspace subscription state.</p>
      </main>
    </div>
  )
}

function Feature({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2 text-sm text-white/55"><Check size={16} className="shrink-0 text-violet-300" />{children}</li>
}
