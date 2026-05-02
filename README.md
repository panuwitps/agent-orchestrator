# Agent Orchestrator

Local-first web orchestrator for `claude` / `codex` / `gemini` CLIs.
See [docs/superpowers/specs/2026-05-02-agent-orchestrator-design.md](docs/superpowers/specs/2026-05-02-agent-orchestrator-design.md) for the full design.

## Phase status

- [x] Phase 1 — Foundation
- [x] Phase 2 — Catalog CRUD (Personas, Roles, Skills, Plugins, MCP, Projects, Components)
- [ ] Phase 3 — Single-agent dispatch
- [ ] Phase 4 — Rich chat UX (slash commands, file refs, attachments, autonomous mode)
- [ ] Phase 5 — Universal MCP Gateway
- [ ] Phase 6 — Multi-agent
- [ ] Phase 7 — Token tracking + E2E suite

## Setup (macOS)

1. Install [Postgres.app](https://postgresapp.com), launch it, click **Initialize** then **Start**. Make sure `psql --version` works in your shell (Postgres.app has a "Configure $PATH" doc).
2. `cp .env.example .env`, then generate secrets and edit `DATABASE_URL` to include your local Postgres user (often `$USER`):
   ```bash
   {
     echo "AUTH_SECRET=$(openssl rand -base64 32)"
     echo "SECRET_KEY=$(openssl rand -base64 32)"
     echo "INTERNAL_API_TOKEN=$(openssl rand -base64 32)"
   } >> .env
   ```
   Open `.env` and remove the duplicated empty lines for the three secret keys, then change `USER` in `DATABASE_URL` to your actual user (e.g., `postgresql://panuwit.s@localhost:5432/agent_orchestrator`).
3. `createdb agent_orchestrator`
4. `pnpm install`
5. `pnpm --filter @ao/db prisma migrate dev`
6. `pnpm dev` — starts Next.js on `:3000` and the Hono orchestrator on `:4000`.
7. Visit `http://localhost:3000` → create the first owner account → sign in.

## Tests

```bash
pnpm test                # unit (vitest)
pnpm test:integration    # integration (real Postgres, vi.stubEnv per test)
```

## Repo layout

```
apps/web              Next.js 15 + Auth.js v5 (JWT session)
apps/orchestrator     Hono service (long-running concerns; healthz + internal-token)
packages/db           Prisma schema + singleton client
packages/shared       Zod validators (barrel) and crypto (subpath: @ao/shared/crypto)
scripts/dev.ts        pnpm dev entrypoint
docs/superpowers/specs/   Design doc
docs/superpowers/plans/   Phase plans
```

## Auth modes

`AUTH_MODE` in `.env`:

- `none` — single auto-default user, no login screen (dev/throwaway).
- `local` (default) — first signup creates the owner; further signups disabled.
- `team` — invite-only signup, optional OAuth (set `AUTH_OAUTH_PROVIDERS=google,github`). Implemented in a later phase.
