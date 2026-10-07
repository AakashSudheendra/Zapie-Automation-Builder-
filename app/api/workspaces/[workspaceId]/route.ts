import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

type Params = { params: Promise<{ workspaceId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })

    const { workspaceId } = await params
    const membership = await db.membership.findFirst({
      where: { userId: user.id, workspaceId },
    })

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ ok: false, error: "Only workspace owners and admins can rename a workspace." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name.trim() : ""

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ ok: false, error: "Workspace name must be between 2 and 80 characters." }, { status: 400 })
    }

    const workspace = await db.workspace.update({
      where: { id: workspaceId },
      data: { name },
    })

    return NextResponse.json({ ok: true, workspace: { id: workspace.id, name: workspace.name } })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update workspace." },
      { status: 500 },
    )
  }
}
