# Zappie — Automation Builder

Zappie is a Next.js automation-builder application inspired by workflow products such as Zapier and the supplied Fuzzie reference architecture. It provides a visual workflow editor, configurable automation steps, execution tracing, templates, connections and workspace-level persistence.

## Current capabilities

- Dashboard with workflow, execution and connection metrics
- Workflow CRUD, publishing and deletion
- Visual workflow editor with:
  - draggable nodes
  - curved workflow connections
  - zoom controls
  - node selection and inspector
  - duplicate/remove steps
  - trigger, action, condition and delay nodes
- Guided configuration for:
  - Webhook
  - Schedule
  - HTTP Request
  - Slack Message
  - Send Email
  - Condition
  - Delay
- Functional workflow templates persisted to the workspace
- Connection workspace
- PostgreSQL persistence through Prisma with browser storage used only as an offline UI fallback
- Workspace membership model, workspace switching and server-side ownership checks
- Workspace member invitations with expiring invite links
- Owner/Admin/Member role management and invitation revocation
- Password authentication with hashed credentials and HttpOnly sessions
- Test execution API
- Real HTTP request execution
- Optional Slack incoming-webhook execution
- Optional production email through Resend
- Published workflow webhook trigger endpoint with secret validation
- Retry/backoff for transient external integration failures
- Conditional execution and bounded delays
- graph-based execution that follows workflow edges rather than canvas position
- Execution history and expandable step logs
- Persisted workspace billing plans and monthly run-limit tracking
- Billing and settings workspace UI, including password changes
- GitHub Actions typecheck/build workflow

## Architecture

```
Next.js App Router
├── Dashboard
├── Workflows
│   └── Visual Editor
│       ├── Step Library
│       ├── Canvas
│       └── Node Inspector
├── Templates
├── Connections
├── Logs
├── Billing
├── Settings
└── API
    └── /api/workflows/[workflowId]/run
        ├── Conditions
        ├── Delays
        ├── HTTP Requests
        ├── Slack Webhooks
        └── Resend Email
```

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Next.js.

## Verify the application

```bash
npm run typecheck
npm run build
npm run start
```

The repository does not currently commit a package lockfile, so use `npm install` rather than `npm ci` for the current project. Verify the latest branch with these commands. The GitHub integration available to this development session cannot execute npm against the remote repository, so a successful local command run is the final environment-specific verification.

## Database and authentication

Set `DATABASE_URL` and `DIRECT_URL` in `.env.local`, then run:

```bash
npm install
npm run db:generate
npm run db:migrate

# Production/CI database deployment
npm run db:deploy
```

The application creates a development workspace automatically when no authenticated session exists outside production. In production, workspace APIs require an authenticated server session. Accounts use bcrypt password hashing and random server-side session tokens stored only as SHA-256 hashes. Profile changes are persisted in PostgreSQL.

The current authentication implementation is intentionally provider-independent. Workspace invitations and role management are handled server-side with membership checks.

## Webhook triggers

Publish a workflow with a Webhook trigger, then call:

```text
POST /api/webhooks/<workflow-id>
x-zappie-webhook-secret: <ZAPPIE_WEBHOOK_SECRET>
content-type: application/json
```

The webhook route accepts JSON payloads, verifies the shared server secret, requires the workflow to be published, and routes the event through the same graph-aware execution engine used by Test Run.

## Scheduled workflows

`vercel.json` configures a minute-level Vercel Cron invocation of `/api/cron/workflows`. The endpoint is protected with `CRON_SECRET`, checks published Schedule triggers, and invokes the same execution engine. The current cron matcher supports five-field expressions with wildcards, lists, ranges and steps and evaluates them in UTC.

## Optional email configuration

Copy `.env.example` to `.env.local` and configure:

```env
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=Zappie <noreply@your-verified-domain.com>
```

Without these values, Send Email remains an explicit safe simulation and never falsely reports delivery.

## Execution model

A test run sends a workflow definition and payload to the execution API. Nodes are evaluated from left to right.

- **Webhook / Schedule:** provide the trigger context.
- **Condition:** compares a payload field against a configured value and can stop downstream execution.
- **Delay:** waits for a bounded duration of up to 5 seconds per step.
- **HTTP Request:** performs a real HTTP request when configured.
- **Slack Message:** posts to a Slack incoming webhook when configured.
- **Send Email:** sends through Resend when the required environment variables and recipient exist; otherwise returns a provider-required simulation result.

The execution route validates remote URLs, blocks common local/metadata hosts, applies request timeouts and limits workflows to 50 steps.

Execution history is persisted in PostgreSQL and exposed through the Logs API. Browser localStorage remains only as a local UI fallback.

## Production boundary

The project now has a functional multi-user workspace foundation with server authentication, PostgreSQL persistence, encrypted credentials, workspace switching, member invitations, role management, webhook/schedule triggers, persisted execution history and workspace run limits. Payment-provider checkout, OAuth authorization flows, durable background workers and distributed rate limiting remain deployment-level integrations that require external provider credentials/infrastructure.

For a hosted multi-user deployment, the next infrastructure layer is:

```
Authentication
      ↓
PostgreSQL
      ↓
Workspace / Workflow API
      ↓
Encrypted Credentials
      ↓
Redis / Durable Queue
      ↓
Workers
      ↓
Retries + Dead Letter Queue
      ↓
Execution Database
      ↓
Logs / Monitoring
```

That layer is required for durable webhooks, real cron scheduling, multi-user isolation, OAuth connections and background execution.

## License

This project is for educational and development use.
