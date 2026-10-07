"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true); setError(""); setMessage("")
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to send reset link.")
      setMessage(data.developmentResetUrl ? `Development reset link: ${data.developmentResetUrl}` : data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset link.")
    } finally { setLoading(false) }
  }

  return <main className="grid min-h-screen place-items-center bg-[#070709] p-6 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-7">
      <Link href="/login" className="flex items-center gap-2 text-xs text-white/40 hover:text-white"><ArrowLeft size={14}/> Back to sign in</Link>
      <div className="mt-7">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Mail size={18}/></div>
        <h1 className="mt-5 text-2xl font-bold">Forgot your password?</h1>
        <p className="mt-2 text-sm text-white/40">Enter your account email and we’ll send a password reset link.</p>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-violet-400/40"/>
        {error && <p className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</p>}
        {message && <p className="break-all rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">{message}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold disabled:opacity-50">{loading ? "Sending…" : "Send reset link"}</button>
      </form>
    </section>
  </main>
}
