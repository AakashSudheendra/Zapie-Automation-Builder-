"use client"

import { useEffect, useState } from "react"
import { Building2, Check, Pencil, Plus, Users, X } from "lucide-react"
import AppHeader from "@/components/global/app-header"

type Workspace = {
  id: string
  name: string
  role: string
  createdAt: string
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentId, setCurrentId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/workspaces", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to load workspaces.")
      setWorkspaces(data.workspaces || [])
      setCurrentId(data.currentWorkspaceId || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workspaces.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createWorkspace = async () => {
    if (newName.trim().length < 2) {
      setError("Workspace name must be at least 2 characters.")
      return
    }

    setCreating(true)
    setError("")
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to create workspace.")
      setNewName("")
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create workspace.")
    } finally {
      setCreating(false)
    }
  }

  const switchWorkspace = async (id: string) => {
    setError("")
    const response = await fetch("/api/workspaces/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || "Unable to switch workspace.")
      return
    }
    window.location.reload()
  }

  const startRename = (workspace: Workspace) => {
    setEditingId(workspace.id)
    setEditingName(workspace.name)
    setError("")
  }

  const renameWorkspace = async () => {
    if (!editingId || editingName.trim().length < 2) return

    const response = await fetch(`/api/workspaces/${editingId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    })
    const data = await response.json()

    if (!response.ok) {
      setError(data.error || "Unable to rename workspace.")
      return
    }

    setEditingId(null)
    await load()
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Workspaces" />

      <main className="max-w-5xl p-6">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/10 to-transparent p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Workspace management</p>
              <h2 className="mt-2 text-2xl font-bold">Organize your automations</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                Workspaces isolate workflows, connections and execution history. Create separate spaces for personal projects, teams or clients.
              </p>
            </div>

            <div className="flex w-full max-w-sm gap-2">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") createWorkspace() }}
                placeholder="New workspace name"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-violet-400/50"
              />
              <button
                type="button"
                onClick={createWorkspace}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                <Plus size={16} />
                Create
              </button>
            </div>
          </div>
        </section>

        {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/80">Your workspaces</h3>
            <span className="text-xs text-white/30">{workspaces.length} total</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-white/35">Loading workspaces…</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {workspaces.map((workspace) => {
                const active = workspace.id === currentId
                const canEdit = workspace.role === "OWNER" || workspace.role === "ADMIN"

                return (
                  <article key={workspace.id} className={`rounded-2xl border p-5 ${active ? "border-violet-400/30 bg-violet-500/[.06]" : "border-white/10 bg-white/[.03]"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-violet-300">
                          <Building2 size={20} />
                        </div>
                        <div className="min-w-0">
                          {editingId === workspace.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-violet-400/50"
                              />
                              <button type="button" onClick={renameWorkspace} className="text-emerald-300"><Check size={16} /></button>
                              <button type="button" onClick={() => setEditingId(null)} className="text-white/30"><X size={16} /></button>
                            </div>
                          ) : (
                            <h4 className="truncate text-sm font-semibold">{workspace.name}</h4>
                          )}
                          <p className="mt-1 text-[10px] uppercase tracking-[.16em] text-white/30">{workspace.role}</p>
                        </div>
                      </div>
                      {active && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                          <Check size={11} /> Active
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-center gap-2 text-xs text-white/35">
                      <Users size={14} />
                      Workspace members
                    </div>

                    <div className="mt-5 flex gap-2">
                      {!active && (
                        <button type="button" onClick={() => switchWorkspace(workspace.id)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black">
                          Switch workspace
                        </button>
                      )}
                      {canEdit && editingId !== workspace.id && (
                        <button type="button" onClick={() => startRename(workspace)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:text-white">
                          <Pencil size={13} /> Rename
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
