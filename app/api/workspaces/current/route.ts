import { NextResponse } from "next/server"
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
