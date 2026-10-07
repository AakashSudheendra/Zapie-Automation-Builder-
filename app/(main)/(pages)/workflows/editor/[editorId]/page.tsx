"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, ChevronDown, GripVertical, Minus, Play, Plus, Save, Trash2, X, ZoomIn } from "lucide-react"
import Link from "next/link"
import WorkflowConfigForm from "@/components/global/workflow-config-form"
import {
  getWorkflow,
  getWorkflowFromServer,
  syncWorkflowToServer,
  NODE_LIBRARY,
  saveExecution,
  upsertWorkflow,
  type Workflow,
  type WorkflowNode,
  type WorkflowNodeType,
} from "@/lib/workflow-store"

const NODE_W = 256
const NODE_H = 112

export default function Editor() {
  const params = useParams<{ editorId: string }>()
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [flow, setFlow] = useState<Workflow | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [saved, setSaved] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState("")
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const local = getWorkflow(params.editorId)
      const remote = await getWorkflowFromServer(params.editorId)
      const w = remote ?? local

      if (!w) {
        router.replace("/workflows")
        return
      }

      const triggerIds = new Set<string>()
      const duplicateTriggerIds = new Set<string>()
      for (const item of w.nodes) {
        if (item.type !== "trigger") continue
        if (triggerIds.size === 0) triggerIds.add(item.id)
        else duplicateTriggerIds.add(item.id)
      }

      if (duplicateTriggerIds.size) {
        const cleaned = {
          ...w,
          nodes: w.nodes.filter((item) => !duplicateTriggerIds.has(item.id)),
          edges: w.edges.filter((edge) => !duplicateTriggerIds.has(edge.source) && !duplicateTriggerIds.has(edge.target)),
          updatedAt: new Date().toISOString(),
        }
        upsertWorkflow(cleaned)
        await syncWorkflowToServer(cleaned)
        if (active) {
          setFlow(cleaned)
          setMessage("Removed duplicate trigger steps. A workflow can have one trigger.")
        }
        return
      }

      if (active) setFlow(w)
    }

    load()
    return () => {
      active = false
    }
  }, [params.editorId, router])

  useEffect(() => {
    if (!dragging || !flow) return

    const move = (event: PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.max(24, (event.clientX - rect.left + canvas.scrollLeft) / zoom - dragging.offsetX)
      const y = Math.max(24, (event.clientY - rect.top + canvas.scrollTop) / zoom - dragging.offsetY)

      setFlow((current) =>
        current
          ? {
              ...current,
              updatedAt: new Date().toISOString(),
              nodes: current.nodes.map((node) => (node.id === dragging.id ? { ...node, x, y } : node)),
            }
          : current,
      )
      setSaved(false)
    }

    const up = () => setDragging(null)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [dragging, flow, zoom])

  const node = useMemo(() => flow?.nodes.find((item) => item.id === selected), [flow, selected])

  if (!flow) return <div className="p-8 text-white/50">Loading workflow…</div>

  const update = (patch: Partial<Workflow>) => {
    setFlow({ ...flow, ...patch, updatedAt: new Date().toISOString() })
    setSaved(false)
  }

  const validationError = () => {
    const triggers = flow.nodes.filter((item) => item.type === "trigger")
    if (triggers.length !== 1) return "A workflow must have exactly one trigger."
    if (flow.nodes.length > 1 && flow.edges.length !== flow.nodes.length - 1) return "Connect every step into one workflow path before publishing."
    const reachable = new Set<string>()
    let current: string | undefined = triggers[0].id
    while (current && !reachable.has(current)) {
      reachable.add(current)
      current = flow.edges.find((edge) => edge.source === current)?.target
    }
    if (reachable.size !== flow.nodes.length) return "Every step must be connected to the trigger."
    return null
  }

  const save = () => {
    const updated = { ...flow, updatedAt: new Date().toISOString() }
    upsertWorkflow(updated)
    void syncWorkflowToServer(updated)
    setSaved(true)
    setMessage("Workflow saved")
  }

  const addNode = (type: WorkflowNodeType, title: string, description: string) => {
    if (type === "trigger" && flow.nodes.some((item) => item.type === "trigger")) {
      setMessage("A workflow can have one trigger. Add an action, condition, or delay instead.")
      return
    }
    const id = Math.random().toString(36).slice(2, 9)
    const parent = selected ? flow.nodes.find((item) => item.id === selected) : flow.nodes[flow.nodes.length - 1]
    const outgoing = parent ? flow.edges.find((edge) => edge.source === parent.id) : undefined
    const downstream = outgoing ? flow.nodes.find((item) => item.id === outgoing.target) : undefined
    const n: WorkflowNode = {
      id,
      type,
      title,
      description,
      x: Math.max(40, (parent?.x ?? 80) + 330),
      y: parent?.y ?? 100,
      config: {},
    }

    const nextEdges = parent
      ? [
          ...flow.edges.filter((edge) => edge.id !== outgoing?.id),
          { id: "e" + id, source: parent.id, target: id },
          ...(downstream ? [{ id: "e" + id + "-next", source: id, target: downstream.id }] : []),
        ]
      : flow.edges

    update({ nodes: [...flow.nodes, n], edges: nextEdges })
    setSelected(id)
  }

  const remove = (id: string) => {
    const incoming = flow.edges.filter((edge) => edge.target === id)
    const outgoing = flow.edges.filter((edge) => edge.source === id)
    const preservedEdges = flow.edges.filter((edge) => edge.source !== id && edge.target !== id)
    const reconnect = incoming.flatMap((inEdge) =>
      outgoing.map((outEdge) => ({
        id: `reconnect-${inEdge.source}-${outEdge.target}`,
        source: inEdge.source,
        target: outEdge.target,
      })),
    )

    update({
      nodes: flow.nodes.filter((item) => item.id !== id),
      edges: [...preservedEdges, ...reconnect.filter((edge, index, list) => list.findIndex((item) => item.source === edge.source && item.target === edge.target) === index)],
    })
    setSelected(null)
  }

  const duplicate = (source: WorkflowNode) => {
    if (source.type === "trigger") {
      setMessage("A workflow can only have one trigger. Duplicate an action, condition, or delay instead.")
      return
    }

    const id = Math.random().toString(36).slice(2, 9)
    const copy: WorkflowNode = { ...source, id, x: source.x + 330, y: source.y }

    const outgoing = flow.edges.find((edge) => edge.source === source.id)
    const nextEdges = [
      ...flow.edges.filter((edge) => edge.id !== outgoing?.id),
      { id: `e-copy-${id}`, source: source.id, target: id },
      ...(outgoing ? [{ id: `e-copy-next-${id}`, source: id, target: outgoing.target }] : []),
    ]

    update({
      nodes: [...flow.nodes, copy],
      edges: nextEdges,
    })
    setSelected(id)
    setMessage("Step duplicated and inserted into the workflow path.")
  }

  const startDrag = (event: ReactPointerEvent, item: WorkflowNode) => {
    if ((event.target as HTMLElement).closest("button")) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const pointerX = (event.clientX - rect.left + canvas.scrollLeft) / zoom
    const pointerY = (event.clientY - rect.top + canvas.scrollTop) / zoom
    setSelected(item.id)
    setDragging({ id: item.id, offsetX: pointerX - item.x, offsetY: pointerY - item.y })
  }

  const run = async () => {
    const error = validationError()
    if (error) {
      setMessage(error)
      return
    }
    setRunning(true)
    setMessage("")
    try {
      const response = await fetch(`/api/workflows/${flow.id}/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workflow: flow, payload: { source: "manual-test", name: "Test lead", status: "approved" } }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Execution failed")

      const now = { ...flow, runs: flow.runs + 1, status: "active" as const, updatedAt: new Date().toISOString() }
      setFlow(now)
      upsertWorkflow(now)
      void syncWorkflowToServer(now)
      setSaved(true)
      saveExecution({
        id: result.executionId,
        workflowId: flow.id,
        workflowName: flow.name,
        status: "completed",
        startedAt: result.triggeredAt,
        finishedAt: new Date().toISOString(),
        trigger: "Manual test",
        steps: result.trace,
      })
      setMessage(`Run ${result.executionId.slice(0, 8)} completed • ${result.trace.length} steps`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed")
    } finally {
      setRunning(false)
    }
  }

  const nodeMap = new Map(flow.nodes.map((item) => [item.id, item]))
  const canvasWidth = Math.max(1400, ...flow.nodes.map((item) => item.x + NODE_W + 160))
  const canvasHeight = Math.max(800, ...flow.nodes.map((item) => item.y + NODE_H + 160))

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-[#070709] text-white">
      <header className="flex h-16 min-w-0 shrink-0 items-center justify-between gap-3 overflow-hidden border-b border-white/10 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/workflows" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <input
              value={flow.name}
              onChange={(event) => update({ name: event.target.value })}
              className="w-40 bg-transparent text-sm font-semibold outline-none sm:w-64"
            />
            <p className="text-[11px] text-white/30">{saved ? "All changes saved" : "Unsaved changes"}</p>
          </div>
        </div>

        <div className="flex min-w-0 max-w-[48%] shrink items-center gap-2 overflow-x-auto pb-px">
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50"
          >
            <Play size={14} />
            {running ? "Running…" : "Test run"}
          </button>
          <button
            onClick={() => {
              if (!flow.published) {
                const error = validationError()
                if (error) {
                  setMessage(error)
                  return
                }
              }
              const next = !flow.published
              const updated = { ...flow, published: next, status: (next ? "active" : "draft") as Workflow["status"] }
              setFlow(updated)
              upsertWorkflow(updated)
              void syncWorkflowToServer(updated)
              setSaved(true)
              setMessage(next ? "Workflow published" : "Workflow unpublished")
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${flow.published ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white"}`}
          >
            {flow.published ? "Published" : "Publish"}
          </button>
          <button
            onClick={save}
            disabled={saved}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </header>

      {message && <div className="border-b border-white/10 bg-white/[.03] px-5 py-2 text-xs text-white/50">{message}</div>}

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 overflow-y-auto border-r border-white/10 bg-black/40 p-3 max-md:hidden">
          <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Step library</p>
          <div className="space-y-2">
            {NODE_LIBRARY.map((item) => (
              <button
                key={item.title}
                onClick={() => addNode(item.type, item.title, item.description)}
                className="group w-full rounded-xl border border-white/10 bg-white/[.03] p-3 text-left hover:border-violet-400/30 hover:bg-violet-500/5"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/10 text-violet-300">
                    <Plus size={14} />
                  </span>
                  <span className="text-xs font-medium">{item.title}</span>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-white/30">{item.description}</p>
              </button>
            ))}
          </div>
        </aside>

        <main ref={canvasRef} className="relative min-h-0 min-w-0 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.07)_1px,transparent_0)] [background-size:24px_24px]">
          <div className="absolute inset-0 overflow-auto">
          <div className="sticky left-4 top-4 z-20 flex w-fit items-center gap-1 rounded-xl border border-white/10 bg-black/70 p-1 backdrop-blur">
            <button onClick={() => setZoom((value) => Math.max(0.65, value - 0.1))} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"><Minus size={14} /></button>
            <span className="w-12 text-center text-[10px] text-white/50">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((value) => Math.min(1.35, value + 0.1))} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"><ZoomIn size={14} /></button>
          </div>

          <div className="relative origin-top-left" style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}>
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${zoom})` }}>
              <svg className="pointer-events-none absolute inset-0" width={canvasWidth} height={canvasHeight}>
                {flow.edges.map((edge) => {
                  const source = nodeMap.get(edge.source)
                  const target = nodeMap.get(edge.target)
                  if (!source || !target) return null
                  const x1 = source.x + NODE_W
                  const y1 = source.y + NODE_H / 2
                  const x2 = target.x
                  const y2 = target.y + NODE_H / 2
                  const curve = Math.max(50, Math.abs(x2 - x1) / 2)
                  return (
                    <g key={edge.id}>
                      <path d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`} fill="none" stroke="rgba(139,92,246,.45)" strokeWidth="2" />
                      <circle cx={x2} cy={y2} r="4" fill="rgba(167,139,250,.9)" />
                    </g>
                  )
                })}
              </svg>

              {flow.nodes.map((item) => (
                <div
                  key={item.id}
                  className="absolute"
                  style={{ left: item.x, top: item.y, width: NODE_W }}
                  onPointerDown={(event) => startDrag(event, item)}
                >
                  <div
                    className={`relative cursor-grab rounded-2xl border p-4 shadow-2xl transition active:cursor-grabbing ${
                      selected === item.id
                        ? "border-violet-400 bg-violet-500/10 shadow-violet-500/10"
                        : "border-white/10 bg-[#111116] hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical size={13} className="text-white/20" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">{item.type}</span>
                      </div>
                      {selected === item.id && <Check size={14} className="text-violet-300" />}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/35">{item.description}</p>
                    <button
                      onClick={() => setSelected(item.id)}
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[#17171d] text-white/50 hover:text-white"
                      aria-label="Select step"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </main>

        {selected && node && (
          <aside className="min-h-0 min-w-0 overflow-y-auto border-l border-white/10 bg-black/70 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300">{node.type}</p>
                <h2 className="mt-1 text-sm font-semibold">{node.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-xs text-white/40">
                Description
                <input
                  value={node.description}
                  onChange={(event) =>
                    update({ nodes: flow.nodes.map((item) => (item.id === node.id ? { ...item, description: event.target.value } : item)) })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-violet-400/50"
                />
              </label>

              {node.title === "Webhook" && (
                <div className="rounded-xl border border-violet-400/15 bg-violet-500/5 p-3">
                  <p className="text-xs font-medium text-violet-200">Webhook endpoint</p>
                  <p className="mt-1 break-all text-[11px] leading-4 text-white/35">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/${flow.id}` : `/api/webhooks/${flow.id}`}
                  </p>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/api/webhooks/${flow.id}`
                      void navigator.clipboard.writeText(url)
                      setMessage("Webhook endpoint copied")
                    }}
                    className="mt-3 w-full rounded-lg border border-white/10 bg-white/[.04] py-2 text-[11px] font-medium text-white/70 hover:bg-white/[.08]"
                  >
                    Copy endpoint
                  </button>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs text-white/40">Configuration</p>
                <WorkflowConfigForm
                  node={node}
                  onChange={(config) => update({ nodes: flow.nodes.map((item) => (item.id === node.id ? { ...item, config } : item)) })}
                />
              </div>

              <button
                onClick={() => duplicate(node)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] py-2.5 text-xs text-white/70 hover:bg-white/[.08]"
              >
                <Plus size={14} />
                Duplicate step
              </button>

              <button
                onClick={() => remove(node.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/5 py-2.5 text-xs text-red-300"
              >
                <Trash2 size={14} />
                Remove step
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

