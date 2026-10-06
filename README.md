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
- Functional workflow templates
- Connection workspace
- Persistent browser workspace state
- Test execution API
- Real HTTP request execution
- Optional Slack incoming-webhook execution
- Optional production email through Resend
- Conditional execution and bounded delays
- graph-based execution that follows workflow edges rather than canvas position
- Execution history and expandable step logs
- Billing and settings workspace UI
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

Execution history is currently stored in browser localStorage.

## Important production boundary

The project is a **fully functional single-browser automation-builder prototype**, not yet a multi-tenant SaaS platform. LocalStorage is intentionally used for the current development phase.

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
