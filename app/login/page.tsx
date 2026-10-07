"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { ArrowRight, LockKeyhole, Mail, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Authentication failed.")
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070709] px-6 text-white">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/30"><Zap size={18} /></span>
          Zappie
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-7 shadow-2xl">
          <div className="mb-7">
            <p className="text-xs uppercase tracking-[.2em] text-violet-300">{mode === "login" ? "Welcome back" : "Get started"}</p>
            <h1 className="mt-2 text-2xl font-bold">{mode === "login" ? "Sign in to Zappie" : "Create your workspace"}</h1>
            <p className="mt-2 text-sm text-white/40">{mode === "login" ? "Continue building your automations." : "Create a secure workspace for your workflows."}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Field icon={<Zap size={15} />} label="Name" value={name} onChange={setName} placeholder="Your name" />
            )}
            <Field icon={<Mail size={15} />} label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
            <Field icon={<LockKeyhole size={15} />} label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" />
            {mode === "login" && <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-[11px] text-violet-300/70 hover:text-violet-300">Forgot password?</Link></div>

            {error && <p className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</p>}

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>

          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }} className="mt-5 w-full text-center text-xs text-white/40 hover:text-white">
            {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  )
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-white/45">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 focus-within:border-violet-400/40">
        <span className="text-white/30">{icon}</span>
        <input value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/20" required />
      </div>
    </label>
  )
}
