import { NextResponse } from "next/server"
import type { Workflow, ExecutionStep } from "@/lib/workflow-store"

function interpolate(value: string, payload: Record<string, unknown>) {
  return value.replace(/{{\\s*([^}]+)\\s*}}/g, (_, key: string) => {
    const result = key.split(".").reduce<unknown>((current, part) => {
      if (current && typeof current === "object") return (current as Record<string, unknown>)[part]
      return undefined
    }, payload)
    return result == null ? "" : String(result)
  })
}

async function executeAction(title: string, config: Record<string, string>, input: Record<string, unknown>) {
  if (title === "HTTP Request") {
    const url = config.url
    if (!url) return { simulated: true, reason: "Add a URL to execute an HTTP request." }
    const method = config.method || "POST"
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json", ...(config.headers ? JSON.parse(config.headers) : {}) },
      body: method === "GET" ? undefined : JSON.stringify(input),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`)
    return { status: response.status, body: text.slice(0, 2000) }
  }

  if (title === "Slack Message" && config.webhookUrl) {
    const message = interpolate(config.message || "Zappie workflow executed.", input)
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: message }),
    })
    if (!response.ok) throw new Error(`Slack webhook returned HTTP ${response.status}`)
    return { delivered: true, message }
  }

  if (title === "Send Email") {
    return { simulated: true, reason: "Configure an email provider before sending production email.", to: config.to || "" }
  }

  return { simulated: true, action: title }
}

export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await params
  const body = await request.json().catch(() => ({}))
  const workflow = body.workflow as Workflow | undefined

  if (!workflow || workflow.id !== workflowId) {
    return NextResponse.json({ ok: false, error: "A workflow definition is required." }, { status: 400 })
  }
  if (!workflow.nodes.length) {
    return NextResponse.json({ ok: false, error: "Workflow has no steps." }, { status: 400 })
  }

  const startedAt = new Date().toISOString()
  const payload = (body.payload ?? {}) as Record<string, unknown>
  const ordered = [...workflow.nodes].sort((a, b) => a.x - b.x)
  const trace: ExecutionStep[] = []
  let current: unknown = payload

  try {
    for (let index = 0; index < ordered.length; index++) {
      const node = ordered[index]
      const stepStarted = new Date().toISOString()
      let output: unknown = current

      if (node.type === "condition") {
        const field = node.config.field
        const expected = node.config.equals
        const actual = field ? field.split(".").reduce<unknown>((v, k) => v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined, payload) : true
        const passed = expected === undefined || String(actual) === expected
        if (!passed) {
          trace.push({ step: index + 1, nodeId: node.id, type: node.type, title: node.title, status: "skipped", startedAt: stepStarted, finishedAt: new Date().toISOString(), input: current, output: { condition: false } })
          break
        }
        output = { condition: true, value: actual }
      } else if (node.type === "delay") {
        const ms = Math.min(Number(node.config.ms || 0), 5000)
        if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
        output = { delayedMs: ms }
      } else if (node.type === "action") {
        output = await executeAction(node.title, node.config, (current ?? payload) as Record<string, unknown>)
      } else if (node.type === "trigger") {
        output = payload
      }

      trace.push({ step: index + 1, nodeId: node.id, type: node.type, title: node.title, status: "completed", startedAt: stepStarted, finishedAt: new Date().toISOString(), input: current, output })
      current = output
    }

    return NextResponse.json({
      ok: true,
      workflowId,
      executionId: crypto.randomUUID(),
      status: "completed",
      triggeredAt: startedAt,
      trace,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      workflowId,
      executionId: crypto.randomUUID(),
      status: "failed",
      triggeredAt: startedAt,
      trace,
      error: error instanceof Error ? error.message : "Execution failed",
    }, { status: 500 })
  }
}
