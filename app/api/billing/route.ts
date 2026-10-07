import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

const PLANS = {
  FREE: { name: "Free", price: 0, workflows: 3, runs: 100, integrations: "Core integrations" },
  PRO: { name: "Pro", price: 1900, workflows: 50, runs: 10000, integrations: "All integrations" },
  UNLIMITED: { name: "Unlimited", price: 5999, workflows: -1, runs: -1, integrations: "All integrations" },
} as const

export async function GET() {
  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const plan = PLANS[workspace.plan as keyof typeof PLANS] || PLANS.FREE
    const periodStart = workspace.planPeriodStart
    const periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    return NextResponse.json({
      ok: true,
      plan: workspace.plan,
      details: plan,
      usage: { runs: workspace.planRuns, periodStart, periodEnd },
      availablePlans: Object.entries(PLANS).map(([id, value]) => ({ id, ...value })),
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load billing." }, { status: 503 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await getOrCreateDevelopmentWorkspace()
    const membership = await db.membership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    })
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ ok: false, error: "Only workspace owners and admins can change the plan." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const plan = typeof body.plan === "string" ? body.plan.toUpperCase() : ""
    if (!(plan in PLANS)) return NextResponse.json({ ok: false, error: "Invalid plan." }, { status: 400 })

    const updated = await db.workspace.update({
      where: { id: workspace.id },
      data: { plan },
    })
    return NextResponse.json({ ok: true, plan: updated.plan })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to update billing plan." }, { status: 500 })
  }
}
