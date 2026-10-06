import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workflowId } = await params
    const secret = process.env.ZAPPIE_WEBHOOK_SECRET
    const supplied = request.headers.get("x-zappie-webhook-secret")

    if (!secret || !supplied || supplied !== secret) {
      return NextResponse.json({ ok: false, error: "Invalid webhook secret." }, { status: 401 })
    }

    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const workflow = await db.workflow.findFirst({
      where: { id: workflowId, workspaceId: workspace.id, published: true },
    })

    if (!workflow) {
      return NextResponse.json({ ok: false, error: "Published workflow not found." }, { status: 404 })
    }

    const contentType = request.headers.get("content-type") || ""
    let payload: unknown = {}
    if (contentType.includes("application/json")) payload = await request.json()
    else payload = { body: await request.text() }

    const runUrl = new URL(`/api/workflows/${workflowId}/run`, request.url)
    const response = await fetch(runUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-zappie-internal-trigger": "webhook",
      },
      body: JSON.stringify({ payload }),
    })

    const result = await response.json().catch(() => ({ ok: false, error: "Execution returned an invalid response." }))
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Webhook execution failed." },
      { status: 500 },
    )
  }
}

export async function GET(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  return POST(new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({}) }), context)
}
