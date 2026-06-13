# FlowPilot Pro

Fresh monorepo scaffold for an automation SaaS:

```txt
FlowPilot-pro/
  apps/
    web/       Next.js frontend
    api/       NestJS backend
    worker/    BullMQ workflow worker
  packages/
    database/  Prisma schema and client
    ui/        shared React components
    nodes/     automation node registry
    shared/    shared types
```

## Prerequisites

- Node.js 20+
- Docker Desktop, or local PostgreSQL + Redis
- npm 10+

## Start locally

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Open:

- Web: http://localhost:3000
- API health: http://localhost:4000/health

## First API test

```bash
curl -X POST http://localhost:4000/flows/demo-flow/run \
  -H "Content-Type: application/json" \
  -d '{"input":{"source":"manual"}}'
```

The API will enqueue a `flow.run` job. The worker consumes the job and executes the registered node handler placeholder.

## Next build steps

1. Add auth and workspace membership.
2. Add the flow builder UI with React Flow.
3. Store flow versions in PostgreSQL.
4. Execute flows through BullMQ only, never directly inside HTTP requests.
5. Add integration credentials with encrypted secrets.
6. Add node packs: triggers, conditions, AI, CRM, WhatsApp, voice, email, documents, payment, and scheduler.
