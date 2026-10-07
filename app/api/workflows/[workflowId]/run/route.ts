import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"
import { decryptSecret } from "@/lib/credentials"
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
  if (blocked.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
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

async function fetchWithRetry(url: URL | string, init: RequestInit, timeoutMs = 10000, attempts = 3) {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs)
      if (response.ok || response.status < 500 || attempt === attempts) return response
      lastError = new Error(`Remote server returned HTTP ${response.status}`)
    } catch (error) {
      lastError = error
      if (attempt === attempts) throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)))
  }
  throw lastError instanceof Error ? lastError : new Error("Remote request failed.")
}

const PLAN_RUN_LIMITS: Record<string, number> = { FREE: 100, PRO: 10000, UNLIMITED: -1 }

async function consumeRunCredit(workspaceId: string) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
  if (!workspace) throw new Error("Workspace not found.")

  const now = new Date()
  const nextPeriod = new Date(workspace.planPeriodStart)
  nextPeriod.setMonth(nextPeriod.getMonth() + 1)

  if (nextPeriod <= now) {
    await db.workspace.update({
      where: { id: workspaceId },
      data: { planRuns: 1, planPeriodStart: now },
    })
    return
  }

  const limit = PLAN_RUN_LIMITS[workspace.plan] ?? PLAN_RUN_LIMITS.FREE
  if (limit >= 0 && workspace.planRuns >= limit) {
    throw new Error(`Monthly run limit reached for the ${workspace.plan} plan.`)
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: { planRuns: { increment: 1 } },
  })
}

async function executeAction(title: string, config: Record<string, string>, input: Record<string, unknown>) {
  if (title === "HTTP Request") {
    const url = config.url
    if (!url) return { simulated: true, reason: "Add a URL to execute an HTTP request." }

    const remoteUrl = validateRemoteUrl(url, "Request URL")
    const method = (config.method || "POST").toUpperCase()
    const headers = parseHeaders(config.headers)

    const response = await fetchWithRetry(remoteUrl, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: ["GET", "HEAD"].includes(method) ? undefined : JSON.stringify(input),
    })

    const text = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`)
    return { status: response.status, body: text.slice(0, 2000) }
  }

  if (title === "Slack Message") {
    let webhookValue = config.webhookUrl

    if (config.credentialId) {
      try {
        const { workspace } = await getOrCreateDevelopmentWorkspace()
        const credential = await db.credential.findFirst({
          where: { id: config.credentialId, workspaceId: workspace.id, provider: "slack" },
        })
        if (credential) {
          const secret = decryptSecret<Record<string, string>>(credential.encrypted)
          webhookValue = secret.webhookUrl || secret.url || secret.value
        }
      } catch {
        // Fall back to an explicitly configured webhook URL.
      }
    }

    if (!webhookValue) return { simulated: true, reason: "Connect a Slack credential or add an incoming webhook URL.", channel: config.channel || "" }

    const webhookUrl = validateRemoteUrl(webhookValue, "Slack webhook URL")
    const message = interpolate(config.message || "Zappie workflow executed.", input)
    const response = await fetchWithRetry(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: message }),
    })

    if (!response.ok) throw new Error(`Slack webhook returned HTTP ${response.status}`)
    return { delivered: true, channel: config.channel || "", message }
  }

  if (title === "Discord Message") {
    let webhookValue = config.webhookUrl

    if (config.credentialId) {
      try {
        const { workspace } = await getOrCreateDevelopmentWorkspace()
        const credential = await db.credential.findFirst({
          where: { id: config.credentialId, workspaceId: workspace.id, provider: "discord" },
        })
        if (credential) {
          const secret = decryptSecret<Record<string, string>>(credential.encrypted)
          webhookValue = secret.webhookUrl || secret.url || secret.value
        }
      } catch {
        // Fall back to an explicitly configured webhook URL.
      }
    }

    if (!webhookValue) return { simulated: true, reason: "Connect a Discord credential or add a webhook URL." }

    const webhookUrl = validateRemoteUrl(webhookValue, "Discord webhook URL")
    const message = interpolate(config.message || "Zappie workflow executed.", input)
    const response = await fetchWithRetry(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: message }),
    })

    if (!response.ok) throw new Error(`Discord webhook returned HTTP ${response.status}`)
    return { delivered: true, provider: "discord", message }
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

    const response = await fetchWithRetry("https://api.resend.com/emails", {
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

async function persistExecution(
  request: Request,
  workflowId: string,
  executionId: string,
  startedAt: string,
  trace: ExecutionStep[],
  status: "completed" | "failed",
  error?: string,
) {
  const internalSecret = request.headers.get("x-zappie-internal-secret")
  const internalTrigger = request.headers.get("x-zappie-internal-trigger")
  const expectedInternalSecret = internalTrigger === "cron" ? process.env.CRON_SECRET : process.env.ZAPPIE_WEBHOOK_SECRET
  const trustedInternal =
    (internalTrigger === "webhook" || internalTrigger === "cron") &&
    !!expectedInternalSecret &&
    internalSecret === expectedInternalSecret

  const authenticated = trustedInternal ? null : await getOrCreateDevelopmentWorkspace()
  const storedWorkflow = authenticated
    ? await db.workflow.findFirst({ where: { id: workflowId, workspaceId: authenticated.workspace.id } })
    : await db.workflow.findFirst({ where: { id: workflowId, published: true } })

  if (!storedWorkflow) return

  await db.$transaction([
    db.execution.create({
      data: {
        id: executionId,
        workspaceId: storedWorkflow.workspaceId,
        workflowId,
        userId: authenticated?.user.id,
        status: status === "completed" ? "COMPLETED" : "FAILED",
        trigger: internalTrigger || "Manual test",
        startedAt: new Date(startedAt),
        finishedAt: new Date(),
        error: error || null,
        steps: {
          create: trace.map((step) => ({
            step: step.step,
            nodeId: step.nodeId,
            title: step.title,
            type: step.type.toUpperCase() as any,
            status: step.status,
            startedAt: new Date(step.startedAt),
            finishedAt: new Date(step.finishedAt),
            input: step.input === undefined ? undefined : JSON.parse(JSON.stringify(step.input)),
            output: step.output === undefined ? undefined : JSON.parse(JSON.stringify(step.output)),
            error: step.error,
          })),
        },
      },
    }),
    db.workflow.update({ where: { id: workflowId }, data: { runs: { increment: 1 } } }),
  ])
}

export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await params
  const body = await request.json().catch(() => ({}))
  const payload = (body.payload ?? {}) as Record<string, unknown>
  let workflow = body.workflow as Workflow | undefined

  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const stored = await db.workflow.findFirst({
      where: { id: workflowId, workspaceId: workspace.id },
      include: { nodes: true, edges: { include: { source: true, target: true } } },
    })

    if (!stored) {
      return NextResponse.json({ ok: false, error: "Workflow not found." }, { status: 404 })
    }

    try {
      await consumeRunCredit(stored.workspaceId)
    } catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Run limit reached." }, { status: 429 })
    }

    workflow = {
      id: stored.id,
      name: stored.name,
      description: stored.description,
      published: stored.published,
      updatedAt: stored.updatedAt.toISOString(),
      runs: stored.runs,
      status: stored.status.toLowerCase() as Workflow["status"],
      nodes: stored.nodes.map((node) => ({
        id: node.nodeKey,
        type: node.type.toLowerCase() as Workflow["nodes"][number]["type"],
        title: node.title,
        description: node.description,
        x: node.x,
        y: node.y,
        config: (node.config ?? {}) as Record<string, string>,
      })),
      edges: stored.edges.map((edge) => ({ id: edge.id, source: edge.source.nodeKey, target: edge.target.nodeKey })),
    }
  } catch (error) {
    const requestHeaders = request.headers
    const internalSecret = requestHeaders.get("x-zappie-internal-secret")
    const internalTrigger = requestHeaders.get("x-zappie-internal-trigger")
    const expectedInternalSecret = internalTrigger === "cron" ? process.env.CRON_SECRET : process.env.ZAPPIE_WEBHOOK_SECRET
    const trustedInternal = (internalTrigger === "webhook" || internalTrigger === "cron") && !!expectedInternalSecret && internalSecret === expectedInternalSecret

    if (process.env.NODE_ENV === "production" && !trustedInternal) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Authentication or database access failed." },
        { status: error instanceof Error && error.message === "Authentication required." ? 401 : 503 },
      )
    }

    if (trustedInternal) {
      const stored = await db.workflow.findFirst({
        where: { id: workflowId, published: true },
        include: { nodes: true, edges: { include: { source: true, target: true } } },
      })
      if (!stored) return NextResponse.json({ ok: false, error: "Published workflow not found." }, { status: 404 })
      try {
        await consumeRunCredit(stored.workspaceId)
      } catch (error) {
        return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Run limit reached." }, { status: 429 })
      }
      workflow = {
        id: stored.id,
        name: stored.name,
        description: stored.description,
        published: stored.published,
        updatedAt: stored.updatedAt.toISOString(),
        runs: stored.runs,
        status: stored.status.toLowerCase() as Workflow["status"],
        nodes: stored.nodes.map((node) => ({
          id: node.nodeKey,
          type: node.type.toLowerCase() as Workflow["nodes"][number]["type"],
          title: node.title,
          description: node.description,
          x: node.x,
          y: node.y,
          config: (node.config ?? {}) as Record<string, string>,
        })),
        edges: stored.edges.map((edge) => ({ id: edge.id, source: edge.source.nodeKey, target: edge.target.nodeKey })),
      }
    }
  }

  if (!workflow || workflow.id !== workflowId) {
    return NextResponse.json({ ok: false, error: "Workflow definition is required." }, { status: 400 })
  }

  if (!workflow.nodes.length) {
    return NextResponse.json({ ok: false, error: "Workflow has no steps." }, { status: 400 })
  }

  if (workflow.nodes.length > 50) {
    return NextResponse.json({ ok: false, error: "Workflow exceeds the 50-step execution limit." }, { status: 400 })
  }

  const startedAt = new Date().toISOString()
  const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]))
  const outgoing = new Map<string, string[]>()
  for (const edge of workflow.edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue
    const targets = outgoing.get(edge.source) ?? []
    targets.push(edge.target)
    outgoing.set(edge.source, targets)
  }

  const trigger = workflow.nodes.find((node) => node.type === "trigger")
  if (!trigger) {
    return NextResponse.json({ ok: false, error: "Workflow must contain a trigger." }, { status: 400 })
  }

  const ordered: typeof workflow.nodes = []
  const visited = new Set<string>()
  let currentNodeId: string | undefined = trigger.id

  while (currentNodeId) {
    if (visited.has(currentNodeId)) {
      return NextResponse.json({ ok: false, error: "Workflow contains a cycle." }, { status: 400 })
    }

    const currentNode = nodeMap.get(currentNodeId)
    if (!currentNode) {
      return NextResponse.json({ ok: false, error: "Workflow contains an invalid connection." }, { status: 400 })
    }

    visited.add(currentNodeId)
    ordered.push(currentNode)
    const targets: string[] = outgoing.get(currentNodeId) ?? []

    if (targets.length > 1) {
      return NextResponse.json({ ok: false, error: "Branching workflows are not supported by this execution engine yet." }, { status: 400 })
    }

    currentNodeId = targets[0]
  }

  if (ordered.length !== workflow.nodes.length) {
    return NextResponse.json({ ok: false, error: "Every workflow step must be connected to the trigger." }, { status: 400 })
  }

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
        const actionInput = {
          ...payload,
          ...(current && typeof current === "object" ? (current as Record<string, unknown>) : {}),
        }
        output = await executeAction(node.title, node.config, actionInput)
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

    const executionId = crypto.randomUUID()

    try {
      await persistExecution(request, workflowId, executionId, startedAt, trace, "completed")
    } catch {
      // The API response remains available even if persistence is temporarily unavailable.
    }

    return NextResponse.json({
      ok: true,
      workflowId,
      executionId,
      status: "completed",
      triggeredAt: startedAt,
      trace,
    })
  } catch (error) {
    const executionId = crypto.randomUUID()
    const message = error instanceof Error ? error.message : "Execution failed"

    try {
      await persistExecution(request, workflowId, executionId, startedAt, trace, "failed", message)
    } catch {
      // Preserve the execution error response even if persistence is unavailable.
    }

    return NextResponse.json(
      {
        ok: false,
        workflowId,
        executionId,
        status: "failed",
        triggeredAt: startedAt,
        trace,
        error: message,
      },
      { status: 500 },
    )
  }
}
