import { NextResponse } from "next/server"
import { db } from "@/lib/db"

function matchesPart(value: number, expression: string, min: number, max: number) {
  return expression.split(",").some((part) => {
    const [base, stepRaw] = part.split("/")
    const step = Number(stepRaw || 1)
    if (!Number.isFinite(step) || step < 1) return false

    if (base === "*") return (value - min) % step === 0
    if (base.includes("-")) {
      const [start, end] = base.split("-").map(Number)
      return value >= start && value <= end && (value - start) % step === 0
    }

    const exact = Number(base)
    return exact === value
  })
}

function cronMatches(expression: string, date: Date) {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return false
  const [minute, hour, day, month, weekday] = parts
  return (
    matchesPart(date.getUTCMinutes(), minute, 0, 59) &&
    matchesPart(date.getUTCHours(), hour, 0, 23) &&
    matchesPart(date.getUTCDate(), day, 1, 31) &&
    matchesPart(date.getUTCMonth() + 1, month, 1, 12) &&
    matchesPart(date.getUTCDay(), weekday, 0, 6)
  )
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

  if (!secret || supplied !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron request." }, { status: 401 })
  }

  try {
    const workflows = await db.workflow.findMany({
      where: { published: true },
      include: { nodes: true },
    })

    const now = new Date()
    const due = workflows.filter((workflow) => {
      const trigger = workflow.nodes.find((node) => node.type === "TRIGGER" && node.title === "Schedule")
      const cron = trigger && typeof trigger.config === "object" && trigger.config && "cron" in trigger.config
        ? String((trigger.config as Record<string, unknown>).cron || "")
        : ""
      return !!cron && cronMatches(cron, now)
    })

    const results = await Promise.all(
      due.map(async (workflow) => {
        const runUrl = new URL(`/api/workflows/${workflow.id}/run`, request.url)
        const response = await fetch(runUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-zappie-internal-trigger": "cron",
            "x-zappie-internal-secret": secret,
          },
          body: JSON.stringify({ payload: { source: "schedule", scheduledAt: now.toISOString() } }),
        })
        return { workflowId: workflow.id, status: response.status }
      }),
    )

    return NextResponse.json({ ok: true, checkedAt: now.toISOString(), triggered: results.length, results })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Cron execution failed." }, { status: 500 })
  }
}
