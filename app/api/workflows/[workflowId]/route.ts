import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

export async function GET(_: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const { workflowId } = await params
    const workflow = await db.workflow.findFirst({
      where: { id: workflowId, workspaceId: workspace.id },
      include: { nodes: true, edges: { include: { source: true, target: true } } },
    })
    if (!workflow) return NextResponse.json({ ok: false, error: "Workflow not found." }, { status: 404 })

    return NextResponse.json({
      ok: true,
      workflow: {
        ...workflow,
        updatedAt: workflow.updatedAt.toISOString(),
        status: workflow.status.toLowerCase(),
        nodes: workflow.nodes.map((node) => ({ ...node, id: node.nodeKey, type: node.type.toLowerCase(), config: node.config })),
        edges: workflow.edges.map((edge) => ({ id: edge.id, source: edge.source.nodeKey, target: edge.target.nodeKey })),
      },
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Database unavailable" }, { status: error instanceof Error && error.message === "Authentication required." ? 401 : 503 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const { workflowId } = await params
    const result = await db.workflow.deleteMany({ where: { id: workflowId, workspaceId: workspace.id } })
    if (!result.count) return NextResponse.json({ ok: false, error: "Workflow not found." }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 })
  }
}
