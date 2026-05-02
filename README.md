# Agent Orchestrator

Local-first web orchestrator for `claude` / `codex` / `gemini` CLIs.

## Setup

1. Install Postgres.app and start it.
2. `cp .env.example .env` and fill in secrets:
   ```bash
   echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
   echo "SECRET_KEY=$(openssl rand -base64 32)" >> .env
   echo "INTERNAL_API_TOKEN=$(openssl rand -base64 32)" >> .env
   ```
3. `createdb agent_orchestrator`
4. `pnpm install`
5. `pnpm --filter @ao/db prisma migrate dev`
6. `pnpm dev`
7. Visit http://localhost:3000.
