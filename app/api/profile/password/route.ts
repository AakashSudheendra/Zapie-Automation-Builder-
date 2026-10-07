import { NextResponse } from "next/server"
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })

    if (!user.passwordHash) {
      return NextResponse.json({ ok: false, error: "Password authentication is not configured for this account." }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : ""
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: "Current and new passwords are required." }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: "New password must contain at least 8 characters." }, { status: 400 })
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ ok: false, error: "New password must be different from the current password." }, { status: 400 })
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 400 })

    const passwordHash = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to change password." }, { status: 500 })
  }
}
