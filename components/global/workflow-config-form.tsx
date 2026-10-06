"use client"

import { useEffect, useState } from "react"
import type { WorkflowNode } from "@/lib/workflow-store"

type Props = {
  node: WorkflowNode
  onChange: (config: Record<string, string>) => void
}

const fields: Record<string, { key: string; label: string; placeholder: string }[]> = {
  "HTTP Request": [
    { key: "url", label: "URL", placeholder: "https://api.example.com/webhook" },
    { key: "method", label: "Method", placeholder: "POST" },
    { key: "headers", label: "Headers JSON", placeholder: '{"authorization":"Bearer ..."}' },
  ],
  "Slack Message": [
    { key: "channel", label: "Channel", placeholder: "#sales" },
    { key: "message", label: "Message", placeholder: "New lead: {{name}}" },
  ],
  "Send Email": [
    { key: "to", label: "Recipient", placeholder: "team@example.com" },
    { key: "subject", label: "Subject", placeholder: "New workflow event" },
    { key: "message", label: "Message", placeholder: "A new event was received." },
  ],
  Condition: [
    { key: "field", label: "Payload field", placeholder: "status" },
    { key: "equals", label: "Equals", placeholder: "approved" },
  ],
  Delay: [
    { key: "ms", label: "Delay (milliseconds)", placeholder: "1000" },
  ],
  Schedule: [
    { key: "cron", label: "Cron expression", placeholder: "0 9 * * 1-5" },
  ],
  Webhook: [
    { key: "method", label: "Method", placeholder: "POST" },
  ],
}

type Credential = { id: string; provider: string; label: string }

export default function WorkflowConfigForm({ node, onChange }: Props) {
  const definitions = fields[node.title] ?? []
  const [credentials, setCredentials] = useState<Credential[]>([])

  useEffect(() => {
    if (node.title !== "Slack Message") return
    fetch("/api/credentials", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return
        const data = await response.json()
        if (data.ok) setCredentials(data.credentials)
      })
      .catch(() => {})
  }, [node.title])

  if (!definitions.length) return <p className="text-xs text-white/30">This step has no additional configuration.</p>

  const slackCredentials = credentials.filter((credential) => credential.provider === "slack")

  return (
    <div className="space-y-3">
      {node.title === "Slack Message" && (
        <label className="block text-xs text-white/45">
          Saved Slack credential
          <select
            value={node.config.credentialId ?? ""}
            onChange={(event) => onChange({ ...node.config, credentialId: event.target.value })}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none focus:border-violet-400/50"
          >
            <option value="">Use webhook URL below / simulation</option>
            {slackCredentials.map((credential) => <option key={credential.id} value={credential.id}>{credential.label}</option>)}
          </select>
        </label>
      )}

      {node.title === "Slack Message" && !node.config.credentialId && (
        <label className="block text-xs text-white/45">
          Incoming webhook URL
          <input
            value={node.config.webhookUrl ?? ""}
            onChange={(event) => onChange({ ...node.config, webhookUrl: event.target.value })}
            placeholder="https://hooks.slack.com/services/..."
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none placeholder:text-white/20 focus:border-violet-400/50"
          />
        </label>
      )}

      {definitions.map((field) => (
        <label key={field.key} className="block text-xs text-white/45">
          {field.label}
          <input
            value={node.config[field.key] ?? ""}
            onChange={(event) => onChange({ ...node.config, [field.key]: event.target.value })}
            placeholder={field.placeholder}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none placeholder:text-white/20 focus:border-violet-400/50"
          />
        </label>
      ))}
    </div>
  )
}
