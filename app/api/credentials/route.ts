import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"
import { encryptSecret } from "@/lib/credentials"

export async function GET() {
  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const credentials = await db.credential.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, provider: true, label: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json({ ok: true, credentials })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load credentials." }, { status: error instanceof Error && error.message === "Authentication required." ? 401 : 503 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await getOrCreateDevelopmentWorkspace()
    const membership = await db.membership.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } } })
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ ok: false, error: "Only workspace owners and admins can manage credentials." }, { status: 403 })
    }

    const body = await request.json()
    const provider = String(body.provider || "").trim()
    const label = String(body.label || provider).trim()
    const secret = body.secret

    if (!provider || !secret || typeof secret !== "object") {
      return NextResponse.json({ ok: false, error: "Provider, label and credential data are required." }, { status: 400 })
    }

    const credential = await db.credential.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        provider,
        label,
        encrypted: encryptSecret(secret),
      },
      select: { id: true, provider: true, label: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({ ok: true, credential })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to store credential." }, { status: 500 })
  }
}
