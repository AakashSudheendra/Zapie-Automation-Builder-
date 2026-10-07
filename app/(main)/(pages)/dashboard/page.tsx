"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Play, Workflow as WorkflowIcon, Zap, Activity } from "lucide-react"
import AppHeader from "@/components/global/app-header"
import { loadWorkflows, loadConnections, type Workflow, type Execution } from "@/lib/workflow-store"

export default function Dashboard() {
  const [flows, setFlows] = useState<Workflow[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [connections, setConnections] = useState(0)

  useEffect(() => {
    let active = true
    setFlows(loadWorkflows())
    setConnections(loadConnections().filter((x) => x.connected).length)

    Promise.all([
      fetch("/api/workflows", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/executions", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/credentials", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([workflowData, executionData, credentialData]) => {
      if (!active) return
      if (workflowData?.ok && Array.isArray(workflowData.workflows)) setFlows(workflowData.workflows)
      if (executionData?.ok && Array.isArray(executionData.executions)) setExecutions(executionData.executions)
      if (credentialData?.ok && Array.isArray(credentialData.credentials)) setConnections(credentialData.credentials.length)
    })

    return () => { active = false }
  }, [])

  const runs = executions.length > 0 ? executions.length : flows.reduce((a, x) => a + x.runs, 0)

  return (
    <div>
      <AppHeader title="Dashboard" />
      <main className="p-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={WorkflowIcon} label="Workflows" value={flows.length} />
          <Metric icon={Zap} label="Active" value={flows.filter((x) => x.published).length} />
          <Metric icon={Play} label="Runs" value={runs} />
          <Metric icon={CheckCircle2} label="Connections" value={connections} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/15 to-transparent p-6">
            <p className="text-sm font-medium text-violet-300">Automation workspace</p>
            <h2 className="mt-3 text-3xl font-bold">Build once. Let Zappie run it.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">
              Design event-driven workflows with triggers, actions, conditions and delays. Workflow state and execution history are persisted in your workspace database.
            </p>
            <Link href="/workflows" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">
              Open workflows <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
            <div className="flex items-center gap-2 text-white/50"><Activity size={16} />Recent activity</div>
            <div className="mt-5 space-y-4">
              {executions.slice(0, 5).map((execution) => (
                <div key={execution.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{execution.workflowName}</p>
                    <p className="text-xs text-white/30">{new Date(execution.startedAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs ${execution.status === "completed" ? "text-emerald-300" : "text-red-300"}`}>
                    {execution.status}
                  </span>
                </div>
              ))}
              {!executions.length && <p className="text-sm text-white/35">No executions yet. Run a workflow to see activity here.</p>}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <Icon size={18} className="text-violet-300" />
      <p className="mt-4 text-sm text-white/40">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  )
}
