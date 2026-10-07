"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Check, LockKeyhole } from "lucide-react"

export default function ResetPassword() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== confirm) { setError("Passwords do not match."); return }
    setLoading(true); setError("")
    try {
      const response = await fetch(`/api/auth/reset-password/${params.token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to reset password.")
      setDone(true)
      setTimeout(() => router.replace("/login"), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.")
    } finally { setLoading(false) }
  }

  return <main className="grid min-h-screen place-items-center bg-[#070709] p-6 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-7">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300">{done ? <Check size={18}/> : <LockKeyhole size={18}/>}</div>
      <h1 className="mt-5 text-2xl font-bold">{done ? "Password updated" : "Set a new password"}</h1>
      <p className="mt-2 text-sm text-white/40">{done ? "Your reset is complete. Redirecting to sign in…" : "Choose a new password with at least 8 characters."}</p>
      {!done && <form onSubmit={submit} className="mt-6 space-y-4">
        <input required minLength={8} type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="New password" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-violet-400/40"/>
        <input required minLength={8} type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Confirm new password" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none focus:border-violet-400/40"/>
        {error && <p className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold disabled:opacity-50">{loading ? "Updating…" : "Reset password"}</button>
      </form>}
      {done && <Link href="/login" className="mt-6 block text-center text-xs text-white/40 hover:text-white">Back to sign in</Link>}
    </section>
  </main>
}
