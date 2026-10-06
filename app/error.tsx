"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070709] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-red-400/20 bg-white/[.03] p-8 text-center shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-300">
          <AlertTriangle size={24} />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-white/40">
          Zappie hit an unexpected application error. Try the page again before restarting the workspace.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold hover:bg-violet-500"
        >
          <RotateCcw size={15} />
          Try again
        </button>
      </div>
    </main>
  )
}
