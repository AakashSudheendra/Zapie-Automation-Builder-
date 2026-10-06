import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createSession, hashPassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    const name = String(body.name || "").trim()

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must contain at least 8 characters." }, { status: 400 })
    }

    const exists = await db.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ ok: false, error: "An account with this email already exists." }, { status: 409 })

    const user = await db.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash: await hashPassword(password),
        memberships: {
          create: {
            role: "OWNER",
            workspace: { create: { name: `${name || email.split("@")[0]}'s Workspace` } },
          },
        },
      },
    })

    await createSession(user.id)
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Registration failed." }, { status: 500 })
  }
}
