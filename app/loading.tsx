export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070709] text-white">
      <div className="flex items-center gap-3 text-sm text-white/45">
        <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
        Loading Zappie…
      </div>
    </main>
  )
}
