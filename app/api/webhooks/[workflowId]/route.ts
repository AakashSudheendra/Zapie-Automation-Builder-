import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { timingSafeEqual } from "node:crypto"

export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workflowId } = await params
    const secret = process.env.ZAPPIE_WEBHOOK_SECRET
    const supplied = request.headers.get("x-zappie-webhook-secret")

    if (!secret || !supplied) {
      return NextResponse.json({ ok: false, error: "Invalid webhook secret." }, { status: 401 })
    }
    const expected = Buffer.from(secret)
    const provided = Buffer.from(supplied)
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      return NextResponse.json({ ok: false, error: "Invalid webhook secret." }, { status: 401 })
    }

    const workflow = await db.workflow.findFirst({
      where: { id: workflowId, published: true },
    })

    if (!workflow) {
      return NextResponse.json({ ok: false, error: "Published workflow not found." }, { status: 404 })
    }

    const contentLength = Number(request.headers.get("content-length") || "0")
    if (Number.isFinite(contentLength) && contentLength > 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Webhook payload exceeds the 1 MB limit." }, { status: 413 })
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
        "x-zappie-internal-secret": secret,
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

export async function GET(_: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await params
  return NextResponse.json({
    ok: true,
    method: "POST",
    endpoint: `/api/webhooks/${workflowId}`,
    requiredHeader: "x-zappie-webhook-secret",
  })
}
