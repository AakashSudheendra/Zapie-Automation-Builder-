import { createHash, randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 })
    }

    const generic = { ok: true, message: "If an account exists for this email, a reset link has been sent." }
    const user = await db.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) return NextResponse.json(generic)

    await db.passwordResetToken.deleteMany({ where: { userId: user.id } })
    const rawToken = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    })

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM_EMAIL
    const origin = new URL(request.url).origin
    const resetUrl = `${origin}/reset-password/${rawToken}`

    if (apiKey && from) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to: [user.email],
          subject: "Reset your Zappie password",
          text: `Use this link to reset your Zappie password. It expires in 1 hour: ${resetUrl}`,
        }),
      })
    }

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ...generic, developmentResetUrl: resetUrl })
    }

    return NextResponse.json(generic)
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to process reset request." }, { status: 500 })
  }
}
