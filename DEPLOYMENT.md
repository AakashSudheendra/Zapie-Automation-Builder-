# Zappie production deployment

## Required services

- Next.js deployment (Vercel is supported by the included vercel.json)
- Hosted PostgreSQL
- A verified email sender such as Resend for production email/password reset
- Optional Slack/Discord webhook credentials

## Environment variables

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
ZAPPIE_WEBHOOK_SECRET=<64+ random characters>
CRON_SECRET=<64+ random characters>
ZAPPIE_ENCRYPTION_KEY=<64 hex characters>
RESEND_API_KEY=<optional>
RESEND_FROM_EMAIL=Zappie <noreply@your-domain.com>
```

Generate the encryption key with:

```bash
openssl rand -hex 32
```

Generate independent webhook/cron secrets with:

```bash
openssl rand -hex 32
```

## Database deployment

Run locally/CI before the application starts:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run build
```

Never use prisma migrate dev against the production database.

## Vercel

The repository contains vercel.json with a minute-level cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/workflows",
      "schedule": "* * * * *"
    }
  ]
}
```

Vercel sends the configured CRON_SECRET as a bearer authorization header. The cron route validates it before reading scheduled workflows.

## Webhooks

Published Webhook workflows use:

```text
POST /api/webhooks/<workflow-id>
x-zappie-webhook-secret: <ZAPPIE_WEBHOOK_SECRET>
content-type: application/json
```

The webhook must target a published workflow and the shared secret must match.

## Security checklist

- Use HTTPS.
- Use a unique ZAPPIE_ENCRYPTION_KEY per environment.
- Use unique webhook and cron secrets.
- Restrict database credentials to the application.
- Configure a verified sender domain for Resend.
- Do not commit .env.local.
- Use npm run db:deploy for migrations.
- Configure monitoring around /api/health.
- Add a durable queue/worker layer before relying on long-running or high-volume automation execution.

## Current execution boundary

Zappie currently executes workflows through Next.js API routes. HTTP, Slack and Discord actions have timeouts/retries and execution history is persisted. For high-volume production workloads, move execution to durable workers/queues so web requests are not responsible for long-running workflow execution.