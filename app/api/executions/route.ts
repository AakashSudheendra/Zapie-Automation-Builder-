import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getOrCreateDevelopmentWorkspace } from "@/lib/server-workspaces"

export async function GET() {
  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    const executions = await db.execution.findMany({
      where: { workspaceId: workspace.id },
      include: { workflow: true, steps: { orderBy: { step: "asc" } } },
      orderBy: { startedAt: "desc" },
      take: 100,
    })

    return NextResponse.json({
      ok: true,
      executions: executions.map((execution) => ({
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflow.name,
        status: execution.status.toLowerCase(),
        startedAt: execution.startedAt.toISOString(),
        finishedAt: (execution.finishedAt ?? execution.startedAt).toISOString(),
        trigger: execution.trigger,
        error: execution.error,
        steps: execution.steps.map((step) => ({
          step: step.step,
          nodeId: step.nodeId,
          type: step.type.toLowerCase(),
          title: step.title,
          status: step.status,
          startedAt: step.startedAt.toISOString(),
          finishedAt: step.finishedAt.toISOString(),
          input: step.input,
          output: step.output,
          error: step.error,
        })),
      })),
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load executions." }, { status: error instanceof Error && error.message === "Authentication required." ? 401 : 503 })
  }
}


export async function DELETE() {
  try {
    const { workspace } = await getOrCreateDevelopmentWorkspace()
    await db.execution.deleteMany({ where: { workspaceId: workspace.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to clear executions." }, { status: error instanceof Error && error.message === "Authentication required." ? 401 : 503 })
  }
}
