export type WorkflowNodeType = "trigger" | "action" | "condition" | "delay"

export type WorkflowNode = {
  id: string
  type: WorkflowNodeType
  title: string
  description: string
  x: number
  y: number
  config: Record<string, string>
}

export type WorkflowEdge = { id: string; source: string; target: string }

export type Workflow = {
  id: string
  name: string
  description: string
  published: boolean
  updatedAt: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  runs: number
  status: "active" | "draft" | "error"
}

export type Connection = {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  lastSync?: string
}

export type ExecutionStep = {
  step: number
  nodeId: string
  type: WorkflowNodeType
  title: string
  status: "completed" | "failed" | "skipped"
  startedAt: string
  finishedAt: string
  input: unknown
  output?: unknown
  error?: string
}

export type Execution = {
  id: string
  workflowId: string
  workflowName: string
  status: "completed" | "failed"
  startedAt: string
  finishedAt: string
  trigger: string
  steps: ExecutionStep[]
}

export const NODE_LIBRARY: { type: WorkflowNodeType; title: string; description: string }[] = [
  { type: "trigger", title: "Webhook", description: "Start when an HTTP webhook is received." },
  { type: "trigger", title: "Schedule", description: "Run automatically on a schedule." },
  { type: "action", title: "Send Email", description: "Send an email notification." },
  { type: "action", title: "Slack Message", description: "Post a message to a Slack channel." },
  { type: "action", title: "HTTP Request", description: "Call any REST endpoint." },
  { type: "condition", title: "Condition", description: "Continue only when a boolean rule matches." },
  { type: "delay", title: "Delay", description: "Wait before continuing to the next step." },
]

const key = "zapie-workflows"
const connectionKey = "zapie-connections"
const executionKey = "zapie-executions"
const uid = () => Math.random().toString(36).slice(2, 10)

export const starterWorkflow = (): Workflow => ({
  id: uid(),
  name: "Lead notification",
  description: "Notify the team when a new lead arrives.",
  published: false,
  updatedAt: new Date().toISOString(),
  runs: 0,
  status: "draft",
  nodes: [
    { id: "trigger", type: "trigger", title: "Webhook", description: "New lead received", x: 90, y: 100, config: { method: "POST" } },
    { id: "notify", type: "action", title: "Slack Message", description: "Notify #sales", x: 430, y: 100, config: { channel: "#sales", message: "New lead received" } },
    { id: "email", type: "action", title: "Send Email", description: "Send confirmation", x: 770, y: 100, config: { to: "sales@example.com", subject: "New lead" } },
  ],
  edges: [
    { id: "e1", source: "trigger", target: "notify" },
    { id: "e2", source: "notify", target: "email" },
  ],
})

export function loadWorkflows(): Workflow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveWorkflows(items: Workflow[]) {
  localStorage.setItem(key, JSON.stringify(items))
}

export function getWorkflow(id: string) {
  return loadWorkflows().find((w) => w.id === id)
}

export function upsertWorkflow(workflow: Workflow) {
  const items = loadWorkflows()
  const i = items.findIndex((w) => w.id === workflow.id)
  if (i < 0) items.unshift(workflow)
  else items[i] = workflow
  saveWorkflows(items)
  return workflow
}

export function deleteWorkflow(id: string) {
  saveWorkflows(loadWorkflows().filter((w) => w.id !== id))
}

export function defaultConnections(): Connection[] {
  return [
    { id: "google", name: "Google Drive", description: "Watch files and folders and trigger workflows.", icon: "G", connected: false },
    { id: "slack", name: "Slack", description: "Send workflow notifications to your team.", icon: "S", connected: false },
    { id: "discord", name: "Discord", description: "Send automated messages through webhooks.", icon: "D", connected: false },
    { id: "notion", name: "Notion", description: "Create and update pages and databases.", icon: "N", connected: false },
    { id: "github", name: "GitHub", description: "React to issues, PRs and repository events.", icon: "GH", connected: false },
    { id: "webhook", name: "Custom Webhook", description: "Connect any service with an HTTP endpoint.", icon: "↗", connected: false },
  ]
}

export function loadConnections(): Connection[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(connectionKey)
    if (raw) return JSON.parse(raw)
  } catch {}
  const value = defaultConnections()
  localStorage.setItem(connectionKey, JSON.stringify(value))
  return value
}

export function toggleConnection(id: string) {
  const items = loadConnections().map((c) =>
    c.id === id ? { ...c, connected: !c.connected, lastSync: !c.connected ? "Just now" : undefined } : c,
  )
  localStorage.setItem(connectionKey, JSON.stringify(items))
  return items
}

export function loadExecutions(): Execution[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(executionKey)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveExecution(execution: Execution) {
  const items = [execution, ...loadExecutions()].slice(0, 100)
  localStorage.setItem(executionKey, JSON.stringify(items))
  return execution
}

export function clearExecutions() {
  localStorage.removeItem(executionKey)
}


export async function loadWorkflowsFromServer(): Promise<Workflow[] | null> {
  if (typeof window === "undefined") return null
  try {
    const response = await fetch("/api/workflows", { cache: "no-store" })
    if (!response.ok) return null
    const data = await response.json()
    if (!data.ok || !Array.isArray(data.workflows)) return null
    saveWorkflows(data.workflows)
    return data.workflows
  } catch {
    return null
  }
}

export async function getWorkflowFromServer(id: string): Promise<Workflow | null> {
  if (typeof window === "undefined") return null
  try {
    const response = await fetch(`/api/workflows/${id}`, { cache: "no-store" })
    if (!response.ok) return null
    const data = await response.json()
    if (!data.ok || !data.workflow) return null
    upsertLocalWorkflow(data.workflow)
    return data.workflow
  } catch {
    return null
  }
}

function upsertLocalWorkflow(workflow: Workflow) {
  const items = loadWorkflows()
  const index = items.findIndex((item) => item.id === workflow.id)
  if (index < 0) items.unshift(workflow)
  else items[index] = workflow
  saveWorkflows(items)
}

export async function syncWorkflowToServer(workflow: Workflow): Promise<Workflow | null> {
  if (typeof window === "undefined") return null
  try {
    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflow }),
    })
    if (!response.ok) return null
    const data = await response.json()
    if (!data.ok || !data.workflow) return null
    upsertLocalWorkflow(data.workflow)
    return data.workflow
  } catch {
    return null
  }
}

export async function deleteWorkflowFromServer(id: string) {
  if (typeof window === "undefined") return false
  try {
    const response = await fetch(`/api/workflows/${id}`, { method: "DELETE" })
    return response.ok
  } catch {
    return false
  }
}
