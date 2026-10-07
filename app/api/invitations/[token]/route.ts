import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

type Params = { params: Promise<{ token: string }> }

export async function POST(_: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Please sign in before accepting this invitation." }, { status: 401 })

    const { token } = await params
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const invitation = await db.invitation.findUnique({ where: { tokenHash } })

    if (!invitation || invitation.status !== "PENDING") {
      return NextResponse.json({ ok: false, error: "This invitation is invalid or has already been used." }, { status: 404 })
    }
    if (invitation.expiresAt <= new Date()) {
      await db.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } })
      return NextResponse.json({ ok: false, error: "This invitation has expired." }, { status: 410 })
    }
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({ ok: false, error: `This invitation was sent to ${invitation.email}.` }, { status: 403 })
    }

    const membership = await db.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({
        where: { userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId } },
      })
      if (existing) return existing

      const created = await tx.membership.create({
        data: { userId: user.id, workspaceId: invitation.workspaceId, role: invitation.role },
      })
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", inviteeId: user.id },
      })
      return created
    })

    const response = NextResponse.json({ ok: true, workspaceId: invitation.workspaceId, role: membership.role })
    response.cookies.set("zappie_workspace_id", invitation.workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
    return response
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to accept invitation." }, { status: 500 })
  }
}
