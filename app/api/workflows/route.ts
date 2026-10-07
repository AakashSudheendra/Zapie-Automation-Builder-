import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

function serializeWorkflow(workflow: any) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    published: workflow.published,
    updatedAt: workflow.updatedAt.toISOString(),
    runs: workflow.runs,
    status: workflow.status.toLowerCase(),
    nodes: workflow.nodes.map((node: any) => ({
      id: node.nodeKey,
      type: node.type.toLowerCase(),
      title: node.title,
      description: node.description,
      x: node.x,
      y: node.y,
      config: node.config ?? {},
    })),
    edges: workflow.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.source.nodeKey,
      target: edge.target.nodeKey,
    })),
  }
}

export async function GET() {
  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const workflows = await db.workflow.findMany({
      where: { workspaceId: workspace.id },
      include: { nodes: true, edges: { include: { source: true, target: true } } },
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json({ ok: true, workflows: workflows.map(serializeWorkflow) })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Database unavailable" }, { status: error instanceof Error && error.message === "Authentication required." ? 401 : 503 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await getOrCreateDevelopmentWorkspace()
    const membership = await db.membership.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } } })
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN" && membership.role !== "MEMBER")) {
      return NextResponse.json({ ok: false, error: "Workspace access denied." }, { status: 403 })
    }
    const body = await request.json()
    const workflow = body.workflow
    if (!workflow?.name || !Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) {
      return NextResponse.json({ ok: false, error: "Invalid workflow payload." }, { status: 400 })
    }
    if (String(workflow.name).trim().length > 120 || String(workflow.description ?? "").length > 1000) {
      return NextResponse.json({ ok: false, error: "Workflow name or description is too long." }, { status: 400 })
    }
    if (workflow.nodes.length < 1 || workflow.nodes.length > 50 || workflow.edges.length > 100) {
      return NextResponse.json({ ok: false, error: "Workflow size is outside the supported limits." }, { status: 400 })
    }
    const nodeIds = new Set(workflow.nodes.map((node: any) => String(node.id)))
    if (nodeIds.size !== workflow.nodes.length || workflow.nodes.some((node: any) => !node.id || !node.title || !["trigger", "action", "condition", "delay"].includes(String(node.type).toLowerCase()))) {
      return NextResponse.json({ ok: false, error: "Workflow contains invalid nodes." }, { status: 400 })
    }
    if (workflow.edges.some((edge: any) => !edge.source || !edge.target || !nodeIds.has(String(edge.source)) || !nodeIds.has(String(edge.target)) || String(edge.source) === String(edge.target))) {
      return NextResponse.json({ ok: false, error: "Workflow contains invalid connections." }, { status: 400 })
    }
    const triggerCount = workflow.nodes.filter((node: any) => String(node.type).toLowerCase() === "trigger").length
    if (triggerCount !== 1) {
      return NextResponse.json({ ok: false, error: "A workflow must contain exactly one trigger." }, { status: 400 })
    }

    const saved = await db.$transaction(async (tx) => {
      const existing = await tx.workflow.findFirst({ where: { id: workflow.id, workspaceId: workspace.id } })
      const record = existing
        ? await tx.workflow.update({
            where: { id: existing.id },
            data: {
              name: workflow.name,
              description: workflow.description ?? "",
              published: Boolean(workflow.published),
              status: String(workflow.status || "draft").toUpperCase() as any,
              runs: existing.runs,
              version: { increment: 1 },
            },
          })
        : await tx.workflow.create({
            data: {
              id: workflow.id,
              workspaceId: workspace.id,
              name: workflow.name,
              description: workflow.description ?? "",
              published: Boolean(workflow.published),
              status: String(workflow.status || "draft").toUpperCase() as any,
              runs: 0,
            },
          })

      await tx.workflowNode.deleteMany({ where: { workflowId: record.id } })
      await tx.workflowEdge.deleteMany({ where: { workflowId: record.id } })

      await tx.workflowNode.createMany({
        data: workflow.nodes.map((node: any) => ({
          workflowId: record.id,
          nodeKey: String(node.id),
          type: String(node.type).toUpperCase(),
          title: String(node.title),
          description: String(node.description ?? ""),
          x: Number(node.x ?? 0),
          y: Number(node.y ?? 0),
          config: node.config ?? {},
        })),
      })

      const nodeIds = new Set(workflow.nodes.map((node: any) => String(node.id)))
      const edges = workflow.edges.filter((edge: any) => nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)))
      const createdNodes = await tx.workflowNode.findMany({ where: { workflowId: record.id } })
      const ids = new Map(createdNodes.map((node) => [node.nodeKey, node.id]))

      await tx.workflowEdge.createMany({
        data: edges.map((edge: any) => ({
          workflowId: record.id,
          sourceId: ids.get(String(edge.source))!,
          targetId: ids.get(String(edge.target))!,
        })),
      })

      return tx.workflow.findUniqueOrThrow({
        where: { id: record.id },
        include: { nodes: true, edges: { include: { source: true, target: true } } },
      })
    })

    return NextResponse.json({ ok: true, workflow: serializeWorkflow(saved) })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 })
  }
}
