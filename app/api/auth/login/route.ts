import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createSession, verifyPassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    const user = await db.user.findUnique({ where: { email } })

    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 })
    }

    await createSession(user.id)
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Login failed." }, { status: 500 })
  }
}
