"use client"

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
    { key: "webhookUrl", label: "Incoming webhook URL", placeholder: "https://hooks.slack.com/services/..." },
    { key: "channel", label: "Channel", placeholder: "#sales" },
    { key: "message", label: "Message", placeholder: "New lead: {{name}}" },
  ],
  "Send Email": [
    { key: "to", label: "Recipient", placeholder: "team@example.com" },
    { key: "subject", label: "Subject", placeholder: "New workflow event" },
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

export default function WorkflowConfigForm({ node, onChange }: Props) {
  const definitions = fields[node.title] ?? []
  if (!definitions.length) return <p className="text-xs text-white/30">This step has no additional configuration.</p>

  return (
    <div className="space-y-3">
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
