import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

export async function GET() {
  try {
    const { user, workspace } = await getOrCreateDevelopmentWorkspace()
    const memberships = await db.membership.findMany({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { workspace: { createdAt: "asc" } },
    })

    return NextResponse.json({
      ok: true,
      workspaces: memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
        createdAt: membership.workspace.createdAt,
      })),
      currentWorkspaceId: workspace.id,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load workspaces." },
      { status: 503 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name.trim() : ""

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { ok: false, error: "Workspace name must be between 2 and 80 characters." },
        { status: 400 },
      )
    }

    const workspace = await db.workspace.create({
      data: {
        name,
        memberships: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    })

    const response = NextResponse.json({
      ok: true,
      workspace: { id: workspace.id, name: workspace.name, role: "OWNER" },
    }, { status: 201 })

    response.cookies.set("zappie_workspace_id", workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to create workspace." },
      { status: 500 },
    )
  }
}
