import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

type Params = { params: Promise<{ token: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const reset = await db.passwordResetToken.findUnique({ where: { tokenHash } })

    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      return NextResponse.json({ ok: false, error: "This password reset link is invalid or expired." }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const password = typeof body.password === "string" ? body.password : ""
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must contain at least 8 characters." }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    await db.$transaction([
      db.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      db.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: reset.userId } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to reset password." }, { status: 500 })
  }
}
