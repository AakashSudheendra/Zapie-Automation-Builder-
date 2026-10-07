"use client"

import { useEffect, useState } from "react"
import { Trash2, CheckCircle2, XCircle, ChevronDown, RotateCcw, Loader2 } from "lucide-react"
import AppHeader from "@/components/global/app-header"
import { clearExecutions, loadExecutions, type Execution } from "@/lib/workflow-store"

export default function Logs() {
  const [items, setItems] = useState<Execution[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const local = loadExecutions()
    setItems(local)
    fetch("/api/executions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        if (data.ok) setItems(data.executions)
      })
      .catch(() => {})
  }, [])

  const retry = async (execution: Execution) => {
    setRetrying(execution.id)
    setError("")
    try {
      const response = await fetch(`/api/workflows/${execution.workflowId}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: { source: "retry", previousExecutionId: execution.id } }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Retry failed.")
      const refreshed = await fetch("/api/executions", { cache: "no-store" })
      const refreshedData = await refreshed.json()
      if (refreshedData.ok) setItems(refreshedData.executions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.")
    } finally {
      setRetrying(null)
    }
  }

  const clear = async () => {
    clearExecutions()
    await fetch("/api/executions", { method: "DELETE" }).catch(() => {})
    setItems([])
  }

  return (
    <div>
      <AppHeader
        title="Logs"
        action={items.length > 0 ? (
          <button onClick={clear} className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
            <Trash2 size={14} /> Clear history
          </button>
        ) : undefined}
      />
      <main className="p-6">
        {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Metric label="Executions" value={items.length} />
          <Metric label="Successful" value={items.filter((x) => x.status === "completed").length} />
          <Metric label="Failed" value={items.filter((x) => x.status === "failed").length} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
          {!items.length ? (
            <p className="py-16 text-center text-sm text-white/35">No executions yet. Open a workflow and run a test.</p>
          ) : items.map((execution) => (
            <div key={execution.id} className="border-b border-white/10 last:border-0">
              <button onClick={() => setExpanded(expanded === execution.id ? null : execution.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-white/[.02]">
                <div className="flex min-w-0 items-center gap-3">
                  {execution.status === "completed" ? <CheckCircle2 className="shrink-0 text-emerald-400" size={18} /> : <XCircle className="shrink-0 text-red-400" size={18} />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{execution.workflowName}</p>
                    <p className="mt-1 text-xs text-white/35">{new Date(execution.startedAt).toLocaleString()} · {execution.steps.length} steps · {execution.trigger}</p>
                  </div>
                </div>
                <ChevronDown size={16} className={expanded === execution.id ? "rotate-180 text-white/60" : "text-white/30"} />
              </button>

              {expanded === execution.id && (
                <div className="border-t border-white/10 bg-black/20 px-5 py-4">
                  {execution.error && (
                    <div className="mb-3 rounded-xl border border-red-400/15 bg-red-500/5 p-3 text-xs text-red-300">
                      {execution.error}
                    </div>
                  )}
                  {execution.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => retry(execution)}
                      disabled={retrying === execution.id}
                      className="mb-3 inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-300 disabled:opacity-50"
                    >
                      {retrying === execution.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Retry execution
                    </button>
                  )}
                  <div className="space-y-2">
                    {execution.steps.map((step) => (
                      <div key={step.nodeId + step.step} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[.02] p-3">
                        <div>
                          <p className="text-xs font-medium">{step.step}. {step.title}</p>
                          <p className="mt-1 text-[11px] text-white/30">{step.type} · {step.status}</p>
                        </div>
                        <span className="text-[11px] text-white/25">{new Date(step.finishedAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-xs text-white/40">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>
}
