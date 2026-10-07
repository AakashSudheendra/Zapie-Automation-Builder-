"use client"

import { useEffect, useState } from "react"
import AppHeader from "@/components/global/app-header"
import { Mail, Shield, Trash2, UserPlus, Users } from "lucide-react"

type Member = { id: string; user: { id: string; name: string | null; email: string; image: string | null }; role: "OWNER" | "ADMIN" | "MEMBER" }
type Invitation = { id: string; email: string; role: string; expiresAt: string; createdAt: string }

export default function MembersPage() {
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [role, setRole] = useState("")
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [inviteUrl, setInviteUrl] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const workspaceResponse = await fetch("/api/workspaces/current", { cache: "no-store" })
      const workspaceData = await workspaceResponse.json()
      if (!workspaceResponse.ok) throw new Error(workspaceData.error || "Unable to load workspace.")
      setWorkspace(workspaceData.workspace)
      const response = await fetch(`/api/workspaces/${workspaceData.workspace.id}/members`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to load members.")
      setMembers(data.members)
      setInvitations(data.invitations)
      setRole(data.currentRole)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load members.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const invite = async () => {
    if (!workspace || !email.trim()) return
    setError("")
    setInviteUrl("")
    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role: inviteRole }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || "Unable to invite member.")
      return
    }
    setEmail("")
    setInviteUrl(data.inviteUrl)
    await load()
  }

  const changeRole = async (membershipId: string, nextRole: string) => {
    if (!workspace) return
    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId, role: nextRole }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || "Unable to change role.")
      return
    }
    await load()
  }

  const remove = async (membershipId: string) => {
    if (!workspace || !confirm("Remove this member from the workspace?")) return
    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || "Unable to remove member.")
      return
    }
    await load()
  }

  const canManage = role === "OWNER" || role === "ADMIN"

  return (
    <div className="min-h-screen">
      <AppHeader title="Members" />
      <main className="max-w-5xl p-6">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/10 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Users size={21} /></div>
            <div>
              <p className="text-xs uppercase tracking-[.18em] text-violet-300">Workspace members</p>
              <h2 className="mt-1 text-2xl font-bold">{workspace?.name || "Workspace"}</h2>
              <p className="mt-2 text-sm text-white/40">Invite teammates and control what they can do inside this workspace.</p>
            </div>
          </div>
        </section>

        {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</div>}

        {canManage && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><UserPlus size={16} /> Invite a member</div>
            <div className="mt-4 flex flex-col gap-2 md:flex-row">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-violet-400/50" />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm">
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button onClick={invite} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold">Create invite</button>
            </div>
            {inviteUrl && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                <p className="text-xs font-semibold text-emerald-300">Invitation created</p>
                <p className="mt-1 break-all text-[11px] text-white/40">{inviteUrl}</p>
                <button onClick={() => navigator.clipboard.writeText(inviteUrl)} className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/60">Copy invite link</button>
              </div>
            )}
          </section>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
          <div className="border-b border-white/10 px-5 py-4"><h3 className="text-sm font-semibold">Members ({members.length})</h3></div>
          {loading ? <p className="p-8 text-center text-sm text-white/35">Loading…</p> : members.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 border-b border-white/10 p-5 last:border-0 sm:flex-row sm:items-center">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-xs font-bold text-violet-300">{(member.user.name || member.user.email).charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.user.name || member.user.email}</p>
                <p className="truncate text-xs text-white/35">{member.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {member.role === "OWNER" ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-300"><Shield size={13} /> Owner</span>
                ) : canManage ? (
                  <>
                    <select value={member.role} onChange={(e) => changeRole(member.id, e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs">
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button onClick={() => remove(member.id)} className="rounded-lg p-2 text-white/30 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={15} /></button>
                  </>
                ) : <span className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/40">{member.role}</span>}
              </div>
            </div>
          ))}
        </section>

        {canManage && invitations.length > 0 && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <h3 className="text-sm font-semibold">Pending invitations ({invitations.length})</h3>
            <div className="mt-3 space-y-2">
              {invitations.map((inv) => <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
                <Mail size={15} className="text-white/30" />
                <span className="flex-1 truncate text-xs text-white/60">{inv.email}</span>
                <span className="text-[10px] uppercase text-white/25">{inv.role}</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!workspace || !confirm("Revoke this invitation?")) return
                    await fetch(`/api/workspaces/${workspace.id}/members`, {
                      method: "DELETE",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ invitationId: inv.id }),
                    })
                    await load()
                  }}
                  className="rounded-lg px-2 py-1 text-[10px] text-red-300/70 hover:bg-red-500/10"
                >
                  Revoke
                </button>
              </div>)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
