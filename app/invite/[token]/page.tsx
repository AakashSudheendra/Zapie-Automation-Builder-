"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Loader2, Users } from "lucide-react"

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading")
  const [message, setMessage] = useState("Checking invitation…")

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          setStatus("ready")
          setMessage("Sign in with the invited email address to continue.")
          return
        }
        setStatus("ready")
        setMessage("You can accept this workspace invitation.")
      })
      .catch(() => {
        setStatus("ready")
        setMessage("Sign in to continue.")
      })
  }, [])

  const accept = async () => {
    setStatus("loading")
    setMessage("Accepting invitation…")
    try {
      const response = await fetch(`/api/invitations/${params.token}`, { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to accept invitation.")
      setStatus("success")
      setMessage("Invitation accepted. Opening your workspace…")
      setTimeout(() => router.replace("/dashboard"), 600)
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unable to accept invitation.")
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black p-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
          {status === "success" ? <Check size={24} /> : status === "loading" ? <Loader2 size={24} className="animate-spin" /> : <Users size={24} />}
        </div>
        <h1 className="mt-5 text-2xl font-bold">Workspace invitation</h1>
        <p className="mt-2 text-sm leading-6 text-white/45">{message}</p>

        {status === "ready" && (
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={accept} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500">
              Accept invitation
            </button>
            <Link href="/login" className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 hover:text-white">
              Sign in with another account
            </Link>
          </div>
        )}

        {status === "error" && (
          <Link href="/dashboard" className="mt-6 inline-block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 hover:text-white">
            Go to dashboard
          </Link>
        )}
      </section>
    </main>
  )
}
