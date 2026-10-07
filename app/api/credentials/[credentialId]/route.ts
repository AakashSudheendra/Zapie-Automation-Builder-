import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

export async function DELETE(_: Request, { params }: { params: Promise<{ credentialId: string }> }) {
  try {
    const { user, workspace } = await getOrCreateDevelopmentWorkspace()
    const membership = await db.membership.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } } })
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ ok: false, error: "Only workspace owners and admins can manage credentials." }, { status: 403 })
    }
    const { credentialId } = await params
    const result = await db.credential.deleteMany({ where: { id: credentialId, workspaceId: workspace.id } })
    if (!result.count) return NextResponse.json({ ok: false, error: "Credential not found." }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to delete credential." }, { status: error instanceof Error && error.message === "Authentication required." ? 401 : 500 })
  }
}
