"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, ChevronDown, LogOut, Plus, Search, Settings, UserCircle, Layers3, Menu, X, LayoutDashboard, Workflow, Link2, BookTemplate, Activity, CreditCard, Users } from "lucide-react"
import { useRouter } from "next/navigation"

type User = { id: string; name: string | null; email: string }
type Workspace = { id: string; name: string; role: string }

export default function AppHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspaceId, setWorkspaceId] = useState("")
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [workspaceError, setWorkspaceError] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me", { cache: "no-store" }),
      fetch("/api/workspaces", { cache: "no-store" }),
    ])
      .then(async ([userResponse, workspaceResponse]) => {
        if (userResponse.ok) {
          const data = await userResponse.json()
          if (data.ok) setUser(data.user)
        }
        if (workspaceResponse.ok) {
          const data = await workspaceResponse.json()
          if (data.ok) {
            setWorkspaces(data.workspaces || [])
            setWorkspaceId(data.currentWorkspaceId || "")
          }
        }
      })
      .catch(() => {})

    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (workspaceRef.current && !workspaceRef.current.contains(target)) setWorkspaceOpen(false)
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const logout = async () => {
    setAccountOpen(false)
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  const switchWorkspace = async (id: string) => {
    if (id === workspaceId) {
      setWorkspaceOpen(false)
      return
    }

    setWorkspaceError("")
    const response = await fetch("/api/workspaces/current", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: id }),
    })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setWorkspaceError(data?.error || "Unable to switch workspace.")
      return
    }

    setWorkspaceId(id)
    setWorkspaceOpen(false)
    window.location.reload()
  }

  const createWorkspace = async () => {
    const name = newWorkspaceName.trim()
    if (name.length < 2) {
      setWorkspaceError("Enter a workspace name.")
      return
    }

    setCreatingWorkspace(true)
    setWorkspaceError("")

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setWorkspaceError(data?.error || "Unable to create workspace.")
        return
      }

      setNewWorkspaceName("")
      setWorkspaceOpen(false)
      window.location.reload()
    } catch {
      setWorkspaceError("Unable to create workspace.")
    } finally {
      setCreatingWorkspace(false)
    }
  }

  const displayName = user?.name?.trim() || "Zappie User"
  const initial = displayName.charAt(0).toUpperCase()
  const currentWorkspace = workspaces.find((workspace) => workspace.id === workspaceId) || workspaces[0]

  return (
    <header className="sticky top-0 z-20 flex h-20 min-w-0 items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div ref={workspaceRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setWorkspaceOpen((value) => !value)}
            className="flex max-w-[190px] items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-2.5 py-2 hover:bg-white/[.08]"
            aria-label="Switch workspace"
            aria-expanded={workspaceOpen}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-600/20 text-violet-300">
              <Layers3 size={15} />
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block text-[9px] uppercase tracking-[.18em] text-white/30">Workspace</span>
              <span className="block truncate text-xs font-semibold text-white/80">
                {currentWorkspace?.name || "Workspace"}
              </span>
            </span>
            <ChevronDown size={13} className={workspaceOpen ? "rotate-180 text-white/60" : "text-white/35"} />
          </button>

          {workspaceOpen && (
            <div className="absolute left-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#111114] p-2 shadow-2xl shadow-black/50">
              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/30">Your workspaces</p>
              </div>

              <div className="max-h-56 space-y-1 overflow-y-auto">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => switchWorkspace(workspace.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5 ${workspace.id === workspaceId ? "bg-violet-500/10 text-white" : "text-white/60"}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-xs font-bold">
                      {workspace.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{workspace.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-white/25">{workspace.role}</span>
                    </span>
                    {workspace.id === workspaceId && <span className="h-2 w-2 rounded-full bg-violet-400" />}
                  </button>
                ))}
              </div>

              <div className="mt-2 border-t border-white/10 pt-2">
                <Link
                  href="/workspaces"
                  onClick={() => setWorkspaceOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-white/55 hover:bg-white/5 hover:text-white"
                >
                  <Layers3 size={15} />
                  Manage workspaces
                </Link>
                <div className="mt-1 flex gap-2 px-1">
                  <input
                    value={newWorkspaceName}
                    onChange={(event) => setNewWorkspaceName(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") createWorkspace() }}
                    placeholder="New workspace name"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs outline-none focus:border-violet-400/50"
                  />
                  <button
                    type="button"
                    onClick={createWorkspace}
                    disabled={creatingWorkspace}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-600 text-white disabled:opacity-50"
                    title="Create workspace"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {workspaceError && <p className="px-2 pt-2 text-[10px] text-red-300">{workspaceError}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="hidden min-w-0 border-l border-white/10 pl-3 sm:block">
          <p className="truncate text-xl font-bold">{title}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen((value) => !value)}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/60 md:hidden"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50 sm:flex">
          <Search size={14} />Search
        </button>

        {action}

        <Link
          href="/"
          title="Open public site"
          className="hidden h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 hover:text-white sm:grid"
        >
          <ArrowUpRight size={17} />
        </Link>

        <div ref={accountRef} className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((value) => !value)}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-2.5 hover:bg-white/[.08]"
            aria-label="Open account menu"
            aria-expanded={accountOpen}
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-xs font-bold text-white">
              {initial}
            </span>
            <span className="hidden max-w-28 text-left sm:block">
              <span className="block truncate text-xs font-semibold text-white/80">{displayName}</span>
              <span className="block truncate text-[10px] text-white/35">{user?.email || "Account"}</span>
            </span>
            <ChevronDown size={14} className={accountOpen ? "rotate-180 text-white/60" : "text-white/35"} />
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#111114] p-2 shadow-2xl shadow-black/50">
              <div className="border-b border-white/10 px-3 py-3">
                <p className="text-xs font-semibold text-white/80">{displayName}</p>
                <p className="mt-1 truncate text-[11px] text-white/35">{user?.email || "Signed in account"}</p>
              </div>

              <div className="mt-1 space-y-1">
                <Link href="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white">
                  <UserCircle size={16} />
                  Account
                </Link>
                <Link href="/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white">
                  <Settings size={16} />
                  Settings
                </Link>
                <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-red-300/80 hover:bg-red-500/10 hover:text-red-300">
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}      {mobileOpen && (
        <div className="absolute left-3 right-3 top-[72px] z-50 rounded-2xl border border-white/10 bg-[#111114] p-2 shadow-2xl shadow-black/50 md:hidden">
          {[
            ["Dashboard", "/dashboard", LayoutDashboard],
            ["Workflows", "/workflows", Workflow],
            ["Connections", "/connections", Link2],
            ["Templates", "/templates", BookTemplate],
            ["Logs", "/logs", Activity],
            ["Billing", "/billing", CreditCard],
            ["Members", "/members", Users],
            ["Settings", "/settings", Settings],
          ].map(([name, href, Icon]) => (
            <Link
              key={href as string}
              href={href as string}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs text-white/60 hover:bg-white/5 hover:text-white"
            >
              <Icon size={16} />
              {name as string}
            </Link>
          ))}
        </div>
      )}

