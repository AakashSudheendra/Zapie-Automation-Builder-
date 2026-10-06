"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Trash2, MoreHorizontal, Workflow as WorkflowIcon } from "lucide-react"
import AppHeader from "@/components/global/app-header"
import {
  deleteWorkflow,
  deleteWorkflowFromServer,
  loadWorkflows,
  loadWorkflowsFromServer,
  starterWorkflow,
  syncWorkflowToServer,
  type Workflow,
  upsertWorkflow,
} from "@/lib/workflow-store"

export default function Workflows() {
  const [items, setItems] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const local = loadWorkflows()
    setItems(local)
    loadWorkflowsFromServer().then((remote) => {
      if (active && remote) setItems(remote)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const create = async () => {
    const w = starterWorkflow()
    w.name = "Untitled workflow"
    upsertWorkflow(w)
    await syncWorkflowToServer(w)
    window.location.href = `/workflows/editor/${w.id}`
  }

  const toggle = async (w: Workflow) => {
    const updated = { ...w, published: !w.published, status: !w.published ? "active" as const : "draft" as const, updatedAt: new Date().toISOString() }
    upsertWorkflow(updated)
    const remote = await syncWorkflowToServer(updated)
    setItems(loadWorkflows())
    if (remote) setItems((current) => current.map((item) => item.id === remote.id ? remote : item))
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this workflow?")) return
    deleteWorkflow(id)
    await deleteWorkflowFromServer(id)
    setItems(loadWorkflows())
  }

  return (
    <div>
      <AppHeader title="Workflows" action={
        <button onClick={create} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500">
          <Plus size={17} />New workflow
        </button>
      } />
      <main className="p-6">
        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <Stat label="Total workflows" value={items.length} />
          <Stat label="Active" value={items.filter((x) => x.published).length} />
          <Stat label="Total runs" value={items.reduce((a, x) => a + x.runs, 0)} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
          {loading ? (
            <div className="p-12 text-center text-sm text-white/35">Loading workflows…</div>
          ) : items.length === 0 ? (
            <Empty onCreate={create} />
          ) : items.map((w) => (
            <div key={w.id} className="flex items-center justify-between border-b border-white/10 p-5 last:border-0">
              <Link href={`/workflows/editor/${w.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${w.published ? "bg-emerald-400" : "bg-white/20"}`} />
                  <div>
                    <h2 className="font-semibold">{w.name}</h2>
                    <p className="mt-1 truncate text-sm text-white/40">{w.description}</p>
                  </div>
                </div>
              </Link>
              <div className="ml-4 flex items-center gap-2">
                <button onClick={() => toggle(w)} className={`rounded-lg px-3 py-1.5 text-xs ${w.published ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/50"}`}>
                  {w.published ? "Published" : "Draft"}
                </button>
                <button onClick={() => remove(w.id)} className="rounded-lg p-2 text-white/35 hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 size={16} />
                </button>
                <Link href={`/workflows/editor/${w.id}`} className="rounded-lg p-2 text-white/35 hover:bg-white/10 hover:text-white">
                  <MoreHorizontal size={17} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><p className="text-sm text-white/40">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
}

function Empty({ onCreate }: { onCreate: () => void }) {
  return <div className="flex flex-col items-center justify-center p-20 text-center">
    <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><WorkflowIcon size={22} /></div>
    <h2 className="text-xl font-semibold">No workflows yet</h2>
    <p className="mt-2 max-w-sm text-sm text-white/40">Create your first automation and connect triggers, actions, conditions and delays visually.</p>
    <button onClick={onCreate} className="mt-6 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold">Create workflow</button>
  </div>
}
