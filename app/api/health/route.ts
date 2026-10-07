import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const started = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      status: "healthy",
      database: "up",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      ok: false,
      status: "degraded",
      database: "down",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
