import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

export async function GET() {
  try {
    const { user, workspace } = await getOrCreateDevelopmentWorkspace()
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      workspace: { id: workspace.id, name: workspace.name },
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Database unavailable" },
      { status: 503 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : ""

    if (!workspaceId) {
      return NextResponse.json({ ok: false, error: "Workspace ID is required." }, { status: 400 })
    }

    const membership = await db.membership.findFirst({
      where: { userId: user.id, workspaceId },
      include: { workspace: true },
    })

    if (!membership) {
      return NextResponse.json({ ok: false, error: "You do not have access to this workspace." }, { status: 403 })
    }

    const response = NextResponse.json({
      ok: true,
      workspace: { id: membership.workspace.id, name: membership.workspace.name, role: membership.role },
    })

    response.cookies.set("zappie_workspace_id", membership.workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to switch workspace." },
      { status: 500 },
    )
  }
}
