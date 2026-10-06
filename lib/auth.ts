import { createHash, randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

const COOKIE = "zappie_session"
const SESSION_DAYS = 30

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex")
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  })

  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  store.delete(COOKIE)
}

export async function getCurrentUser() {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: session.id } })
    store.delete(COOKIE)
    return null
  }

  return session.user
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}
