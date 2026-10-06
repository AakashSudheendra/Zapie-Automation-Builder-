# Zappie — Automation Builder

Zappie is a Next.js automation-builder application inspired by workflow platforms such as Zapier and the supplied Fuzzie reference architecture.

## What is implemented

- Dashboard with workflow, run, activity and connection metrics
- Workflow CRUD and publishing
- Visual workflow editor
- Trigger, action, condition and delay nodes
- Guided configuration for webhook, schedule, HTTP, Slack, email, condition and delay steps
- Workflow templates
- Connection workspace
- Persistent browser workspace state
- Test execution API
- Real HTTP request execution
- Optional Slack incoming-webhook execution
- Conditional execution and bounded delays
- Persistent execution history and expandable logs
- Billing and settings workspace UI
- Production typecheck/build CI

## Architecture

```
Next.js App Router
├── Dashboard
├── Workflows
│   └── Visual Editor
├── Templates
├── Connections
├── Logs
├── Billing
├── Settings
└── API
    └── /api/workflows/[workflowId]/run
```

The current application uses browser localStorage for workspace persistence. This makes the project easy to run locally and avoids requiring external credentials during development.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Next.js.

## Verify production build

```bash
npm run typecheck
npm run build
npm run start
```

## Execution model

A test run sends the workflow definition and payload to the execution API. Nodes are evaluated in canvas order.

- **Webhook / Schedule:** provide the trigger context.
- **Condition:** compares a payload field against a configured value and can stop downstream execution.
- **Delay:** waits for a bounded duration.
- **HTTP Request:** performs a real HTTP request when a URL is configured.
- **Slack Message:** can post to a Slack incoming webhook when configured.
- **Send Email:** currently records a provider-required result instead of pretending an email was delivered.

Execution results are stored locally and surfaced in Logs.

## Production roadmap

For a multi-user hosted deployment, replace localStorage with a database and add authentication, encrypted secrets, a durable job queue, cron scheduling, webhook persistence, retry policies, rate limiting, observability and provider-specific OAuth flows.

## License

This project is for educational and development use.
