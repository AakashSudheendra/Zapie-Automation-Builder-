import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
  })
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })

  try {
    const body = await request.json()
    const name = String(body.name || "").trim().slice(0, 80)

    if (!name) {
      return NextResponse.json({ ok: false, error: "Display name is required." }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { name },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update profile." },
      { status: 500 },
    )
  }
}
