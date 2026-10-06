import { NextResponse } from "next/server"
import type { Workflow, ExecutionStep } from "@/lib/workflow-store"

function interpolate(value: string, payload: Record<string, unknown>) {
  return value.replace(/{{\s*([^}]+)\s*}}/g, (_, key: string) => {
    const result = key.split(".").reduce<unknown>((current, part) => {
      if (current && typeof current === "object") return (current as Record<string, unknown>)[part]
      return undefined
    }, payload)
    return result == null ? "" : String(result)
  })
}

function parseHeaders(raw: string | undefined) {
  if (!raw) return {}
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Headers must be a JSON object.")
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]))
}

function validateRemoteUrl(raw: string, label: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${label} must be a valid URL.`)
  }

  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${label} must use HTTP or HTTPS.`)

  const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254", "metadata.google.internal"]
  if (blocked.some((host) => url.hostname === host || url.hostname.endsWith(`.\${host}`))) {
    throw new Error(`${label} points to a blocked internal host.`)
  }

  return url
}

async function fetchWithTimeout(url: URL | string, init: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function executeAction(title: string, config: Record<string, string>, input: Record<string, unknown>) {
  if (title === "HTTP Request") {
    const url = config.url
    if (!url) return { simulated: true, reason: "Add a URL to execute an HTTP request." }

    const remoteUrl = validateRemoteUrl(url, "Request URL")
    const method = (config.method || "POST").toUpperCase()
    const headers = parseHeaders(config.headers)

    const response = await fetchWithTimeout(remoteUrl, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(input),
    })

    const text = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`)
    return { status: response.status, body: text.slice(0, 2000) }
  }

  if (title === "Slack Message") {
    if (!config.webhookUrl) return { simulated: true, reason: "Add a Slack incoming webhook URL.", channel: config.channel || "" }

    const webhookUrl = validateRemoteUrl(config.webhookUrl, "Slack webhook URL")
    const message = interpolate(config.message || "Zappie workflow executed.", input)
    const response = await fetchWithTimeout(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: message }),
    })

    if (!response.ok) throw new Error(`Slack webhook returned HTTP ${response.status}`)
    return { delivered: true, channel: config.channel || "", message }
  }

  if (title === "Send Email") {
    const to = config.to
    const subject = config.subject || "Zappie workflow notification"
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM_EMAIL

    if (!apiKey || !from || !to) {
      return {
        simulated: true,
        reason: "Set RESEND_API_KEY, RESEND_FROM_EMAIL and a recipient to enable production email.",
        to: to || "",
        subject,
      }
    }

    const response = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: interpolate(config.message || "Zappie workflow executed.", input),
      }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`)
    return { delivered: true, provider: "resend", id: result.id, to, subject }
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

  if (workflow.nodes.length > 50) {
    return NextResponse.json({ ok: false, error: "Workflow exceeds the 50-step execution limit." }, { status: 400 })
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
        const actual = field
          ? field.split(".").reduce<unknown>(
              (value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined),
              payload,
            )
          : true
        const passed = expected === undefined || String(actual) === expected

        if (!passed) {
          trace.push({
            step: index + 1,
            nodeId: node.id,
            type: node.type,
            title: node.title,
            status: "skipped",
            startedAt: stepStarted,
            finishedAt: new Date().toISOString(),
            input: current,
            output: { condition: false, field, actual, expected },
          })
          break
        }

        output = { condition: true, field, value: actual }
      } else if (node.type === "delay") {
        const requestedMs = Number(node.config.ms || 0)
        if (!Number.isFinite(requestedMs) || requestedMs < 0) throw new Error("Delay must be a non-negative number.")
        const ms = Math.min(requestedMs, 5000)
        if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
        output = { delayedMs: ms }
      } else if (node.type === "action") {
        output = await executeAction(node.title, node.config, (current ?? payload) as Record<string, unknown>)
      } else if (node.type === "trigger") {
        output = payload
      }

      trace.push({
        step: index + 1,
        nodeId: node.id,
        type: node.type,
        title: node.title,
        status: "completed",
        startedAt: stepStarted,
        finishedAt: new Date().toISOString(),
        input: current,
        output,
      })
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
    return NextResponse.json(
      {
        ok: false,
        workflowId,
        executionId: crypto.randomUUID(),
        status: "failed",
        triggeredAt: startedAt,
        trace,
        error: error instanceof Error ? error.message : "Execution failed",
      },
      { status: 500 },
    )
  }
}
