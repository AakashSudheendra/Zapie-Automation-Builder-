"use client"

import { useState } from "react"
import { Check, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import AppHeader from "@/components/global/app-header"
import { upsertWorkflow, type Workflow } from "@/lib/workflow-store"

const templates = [
  { name: "Lead alert", description: "Notify sales when a new lead arrives.", flow: "Webhook → Slack → Email", nodes: [["Webhook", "New lead received"], ["Slack Message", "Notify sales"], ["Send Email", "Send confirmation"]] },
  { name: "Daily digest", description: "Run an API request on a schedule and notify the team.", flow: "Schedule → HTTP Request → Email", nodes: [["Schedule", "Daily at 9 AM"], ["HTTP Request", "Fetch daily data"], ["Send Email", "Send digest"]] },
  { name: "Support routing", description: "Route incoming support events based on a payload field.", flow: "Webhook → Condition → Slack", nodes: [["Webhook", "Support ticket received"], ["Condition", "Priority equals urgent"], ["Slack Message", "Alert support"]] },
] as const

export default function Templates() {
  const router = useRouter()
  const [created, setCreated] = useState<string | null>(null)

  const useTemplate = (template: (typeof templates)[number]) => {
    const now = new Date().toISOString()
    const workflow: Workflow = {
      id: Math.random().toString(36).slice(2, 10),
      name: template.name,
      description: template.description,
      published: false,
      updatedAt: now,
      runs: 0,
      status: "draft",
      nodes: template.nodes.map(([title, description], index) => ({
        id: `node-${index}-${Math.random().toString(36).slice(2, 6)}`,
        type: index === 0 ? "trigger" : title === "Condition" ? "condition" : "action",
        title,
        description,
        x: 90 + index * 340,
        y: 100,
        config: {},
      })),
      edges: template.nodes.slice(1).map((_, index) => ({
        id: `edge-${index}`,
        source: "",
        target: "",
      })),
    }
    workflow.edges = workflow.nodes.slice(1).map((node, index) => ({ id: `edge-${index}`, source: workflow.nodes[index].id, target: node.id }))
    upsertWorkflow(workflow)
    setCreated(template.name)
    setTimeout(() => router.push(`/workflows/editor/${workflow.id}`), 250)
  }

  return (
    <div>
      <AppHeader title="Templates" />
      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Start from a template</h2>
          <p className="mt-2 text-sm text-white/40">Use a proven workflow shape, then customize every step.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {templates.map((template) => (
            <article key={template.name} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <p className="text-xs uppercase tracking-widest text-violet-300">Template</p>
              <h2 className="mt-3 font-semibold">{template.name}</h2>
              <p className="mt-2 min-h-10 text-sm text-white/40">{template.description}</p>
              <div className="mt-5 rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-white/50">{template.flow}</div>
              <button onClick={() => useTemplate(template)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-semibold">
                {created === template.name ? <><Check size={14}/>Created</> : <><Plus size={14}/>Use template</>}
              </button>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
