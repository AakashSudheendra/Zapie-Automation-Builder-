import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

export async function DELETE(_: Request, { params }: { params: Promise<{ credentialId: string }> }) {
  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const { credentialId } = await params
    const result = await db.credential.deleteMany({ where: { id: credentialId, workspaceId: workspace.id } })
    if (!result.count) return NextResponse.json({ ok: false, error: "Credential not found." }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to delete credential." }, { status: error instanceof Error && error.message === "Authentication required." ? 401 : 500 })
  }
}
