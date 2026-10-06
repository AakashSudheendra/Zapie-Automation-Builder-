import { db } from "@/lib/db"

export async function getOrCreateDevelopmentWorkspace() {
  const email = process.env.ZAPPIE_DEV_EMAIL || "demo@zappie.local"
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Zappie Demo" },
  })

  const existing = await db.membership.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  })

  if (existing) return { user, workspace: existing.workspace }

  const workspace = await db.workspace.create({
    data: {
      name: "My Zappie Workspace",
      memberships: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  })

  return { user, workspace }
}
