import { createHash, randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

type Params = { params: Promise<{ workspaceId: string }> }

async function authorize(userId: string, workspaceId: string) {
  return db.membership.findFirst({ where: { userId, workspaceId } })
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })
    const { workspaceId } = await params
    const membership = await authorize(user.id, workspaceId)
    if (!membership) return NextResponse.json({ ok: false, error: "Workspace access denied." }, { status: 403 })

    const [members, invitations] = await Promise.all([
      db.membership.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { id: "asc" },
      }),
      db.invitation.findMany({
        where: { workspaceId, status: "PENDING" },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      ok: true,
      members: members.map((m) => ({ id: m.id, user: m.user, role: m.role })),
      invitations,
      currentRole: membership.role,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load members." }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })
    const { workspaceId } = await params
    const membership = await authorize(user.id, workspaceId)
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ ok: false, error: "Only owners and admins can invite members." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const role = body.role === "ADMIN" ? "ADMIN" : "MEMBER"

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      const existingMembership = await db.membership.findUnique({
        where: { userId_workspaceId: { userId: existing.id, workspaceId } },
      })
      if (existingMembership) return NextResponse.json({ ok: false, error: "This user is already a workspace member." }, { status: 409 })
    }

    const pending = await db.invitation.findFirst({
      where: { workspaceId, email, status: "PENDING", expiresAt: { gt: new Date() } },
    })
    if (pending) return NextResponse.json({ ok: false, error: "A pending invitation already exists for this email." }, { status: 409 })

    const rawToken = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invitation = await db.invitation.create({
      data: {
        workspaceId,
        inviterId: user.id,
        inviteeId: existing?.id,
        email,
        role,
        tokenHash,
        expiresAt,
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    })

    const origin = new URL(request.url).origin
    return NextResponse.json({
      ok: true,
      invitation,
      inviteUrl: `${origin}/invite/${rawToken}`,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to create invitation." }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })
    const { workspaceId } = await params
    const actor = await authorize(user.id, workspaceId)
    if (!actor || (actor.role !== "OWNER" && actor.role !== "ADMIN")) {
      return NextResponse.json({ ok: false, error: "Only owners and admins can change roles." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const membershipId = typeof body.membershipId === "string" ? body.membershipId : ""
    const role = body.role === "ADMIN" || body.role === "MEMBER" ? body.role : ""

    if (!membershipId || !role) return NextResponse.json({ ok: false, error: "Membership and role are required." }, { status: 400 })

    const target = await db.membership.findFirst({ where: { id: membershipId, workspaceId } })
    if (!target) return NextResponse.json({ ok: false, error: "Member not found." }, { status: 404 })
    if (target.role === "OWNER") return NextResponse.json({ ok: false, error: "The workspace owner cannot be demoted." }, { status: 400 })
    if (actor.role === "ADMIN" && role === "ADMIN" && target.userId !== actor.userId) {
      return NextResponse.json({ ok: false, error: "Admins cannot promote another member to admin." }, { status: 403 })
    }

    const updated = await db.membership.update({ where: { id: membershipId }, data: { role } })
    return NextResponse.json({ ok: true, membership: { id: updated.id, role: updated.role } })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to change role." }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })
    const { workspaceId } = await params
    const actor = await authorize(user.id, workspaceId)
    if (!actor || (actor.role !== "OWNER" && actor.role !== "ADMIN")) {
      return NextResponse.json({ ok: false, error: "Only owners and admins can remove members." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const membershipId = typeof body.membershipId === "string" ? body.membershipId : ""
    const target = await db.membership.findFirst({ where: { id: membershipId, workspaceId } })
    if (!target) return NextResponse.json({ ok: false, error: "Member not found." }, { status: 404 })
    if (target.role === "OWNER") return NextResponse.json({ ok: false, error: "The workspace owner cannot be removed." }, { status: 400 })
    if (actor.role === "ADMIN" && target.role === "ADMIN") {
      return NextResponse.json({ ok: false, error: "Admins cannot remove another admin." }, { status: 403 })
    }

    await db.membership.delete({ where: { id: membershipId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to remove member." }, { status: 500 })
  }
}
