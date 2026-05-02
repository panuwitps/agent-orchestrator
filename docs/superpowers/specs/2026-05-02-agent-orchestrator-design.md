# Agent Orchestrator — Design Document

**Date:** 2026-05-02
**Status:** Draft (pending user review)
**Author:** Panuwit S. (with Claude as drafting partner)

---

## 1. Overview

A web-based **agent orchestrator** that drives `claude`, `codex`, and `gemini` CLI tools (via their subscription plans, not API keys) to perform software-engineering work across user-managed projects. Users compose **Personas** (with multiple **Roles**, **Skills**, **Plugins**, and **MCP servers**) and dispatch work to **Tickets** (persistent sessions) within **Projects** (workspaces of components/repos). Multiple agents collaborate inside a single ticket.

The product runs locally as the default deployment (single-user, single binary), with the same code path supporting team mode (multi-user, OAuth, sharing) via a configuration flag.

## 2. Goals & Non-Goals

### Goals
- Use Claude/ChatGPT/Gemini **subscription plans** as the default cost model — avoid per-token API spend.
- Provide a high-density, keyboard-first web UI inspired by Linear/Cursor for managing personas, roles, skills, plugins, MCP servers, projects, and tickets.
- Support **multi-agent collaboration** within a single ticket from MVP, with parallel execution and per-file FIFO conflict serialization controlled by orchestrator.
- Centralize **MCP servers as a universal gateway** so all providers connect through one in-process MCP host.
- Persist sessions: tickets are resumable indefinitely; closing the browser does not lose state.
- Support both **interactive** and **autonomous** dispatch modes.
- Local-first with a clean upgrade path to team mode (no rewrites).

### Non-Goals
- Not a hosted SaaS in v1 (architecture is ready, deployment isn't).
- No mobile-first UI; desktop browser only.
- No automatic role-routing of requests across multiple personas (user controls multi-agent dispatch).
- No backwards-compat with API-key-based providers as the primary path (supported only as fallback).
- No git/PR creation flow (out of scope; agents may use git via Bash, but no native UI).

## 3. User Personas & Use Cases

**Primary user:** A senior developer/engineer running multiple repositories who wants to direct AI agents at structured tasks without being charged per token. Uses Claude Code today and is familiar with skills/plugins/MCP.

**Use cases:**
- Open a workspace ("Promotion Feature") with components for `user-frontend`, `user-backend`, `provider-gateway`, `admin-frontend`. Dispatch a "Backend Dev" persona to add an endpoint, then bring in a "Reviewer" persona to critique the change.
- Maintain a personal catalog of personas (Senior Backend Alex, Pragmatic Reviewer Sam, Test Writer Pat) reusable across projects.
- Save tokens by routing simple tasks to gemini/flash and complex ones to claude/opus, while never paying per-token because the orchestrator drives subscription CLIs.

## 4. Architecture

### 4.1 Process topology

Two long-running processes per local install:

```
+------------------+
|  Browser (3000)  |
+--------+---------+
         | HTTP + SSE (cookies)
         v
+--------------------------------+
|  Next.js 15 App  (port 3000)   |
|  - App Router UI               |
|  - Route Handlers (CRUD)       |
|  - Auth.js (sessions)          |
|  - SSE proxy → Orchestrator    |
+----+-------------------+-------+
     |                   |
     | HTTP/SSE          | Prisma (Postgres)
     | (X-Internal-Token,| pooled
     |  X-User-Id)       |
     v                   v
+--------------------------+   +-------------------+
| Orchestrator (Hono, 4000)|   |     Postgres      |
| - HTTP API (internal)    |<->|  + PgBoss tables  |
| - Task queue (PgBoss)    |   |  + app tables     |
| - Session manager (pty)  |   +-------------------+
| - Provider adapters      |
| - MCP Gateway (in-proc)  |
| - File watcher (chokidar)|
+--+-----------------+-----+
   |                 |
   v                 v
+----------------+   +-----------------------------+
| pty subprocess |   | Downstream MCP servers      |
| (claude/codex/ |   | (postgres, figma, playwright|
|  gemini CLI)   |   |  spawned/managed by gateway)|
+----------------+   +-----------------------------+
```

**Why two processes:**
- Next.js dev mode reloads modules, killing long-lived child processes. CLI subprocesses must live in a process Next does not own.
- Next.js Route Handlers have request lifetime semantics that don't fit minute-scale streaming work. Orchestrator owns long-running concerns.
- The boundary becomes a natural seam for team-mode horizontal scaling (multiple orchestrators reading the same PgBoss queue).

### 4.2 Monorepo layout

```
agent-orchestrator/
├── apps/
│   ├── web/              # Next.js 15 App Router
│   └── orchestrator/     # Hono service
├── packages/
│   ├── db/               # Prisma schema + client
│   ├── shared/           # zod schemas, ref/slash parsers, crypto helpers
│   ├── provider-adapters/# claude/codex/gemini adapters (Strategy)
│   └── test-utils/       # factories, mock CLI binary
├── scripts/
│   ├── seed.ts           # seed providers, system Orchestrator-Coordinator role
│   └── dev.ts            # concurrently start web + orchestrator
├── tests/
│   └── fixtures/mock-cli/  # deterministic fake CLI for e2e
├── docker-compose.yml    # optional, for team-mode deploy
└── package.json          # pnpm workspaces
```

### 4.3 Tech stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 15 (App Router), Tailwind, shadcn/ui | Familiar, RSC where useful, dense UI primitives |
| Auth | Auth.js v5 (NextAuth) | Standard, supports credentials + OAuth via flag |
| Backend (CRUD) | Next.js Route Handlers | Co-located with UI |
| Orchestrator | Node.js + Hono | Lightweight, modern, SSE/WebSocket helpers |
| ORM | Prisma | Type-safe, mature migrations |
| DB | Postgres (Postgres.app on Mac for local; native install — no Docker required) | Future-proof for team mode |
| Queue | PgBoss | Postgres-backed; no Redis dependency |
| CLI subprocess | `node-pty` | Real PTY for interactive features (TTY) |
| MCP | `@modelcontextprotocol/sdk` (TypeScript) | Official, server + client both |
| Streaming | Server-Sent Events (SSE) | Simpler than WS; one-way fits use case |
| Dev runner | `concurrently` (via `scripts/dev.ts`) | Single `pnpm dev` starts both apps |
| Package manager | pnpm + workspaces | Fast, monorepo-native |
| Test (unit/int) | Vitest | Fast, TypeScript-first |
| Test (e2e) | Playwright | Industry standard |

## 5. Data Model

Schemas below are conceptual; final Prisma DSL lives in `packages/db/schema.prisma`.

### 5.1 Identity

```
User
  id, email (unique), hashedPassword (bcrypt, nullable for OAuth-only),
  name, role ('owner'|'admin'|'member'),
  createdAt, updatedAt

Session                 // Auth.js Prisma adapter
Account                 // Auth.js Prisma adapter (OAuth links)
VerificationToken       // Auth.js Prisma adapter
```

### 5.2 Provider catalog (seeded)

```
Provider
  id, slug ('claude'|'codex'|'gemini'), name, cliCommand,
  supportsSkills (bool), supportsPlugins (bool), supportsMcp (bool),
  modelOptions (jsonb)  -- [{id, name, effortLevels:[]}]
```

### 5.3 Personas, Roles, Skills

```
Persona
  id, name, description, identityPrompt (text), avatarUrl?,
  ownerId, isWorkspaceShared (bool, team only),
  createdAt, updatedAt

PersonaRole                          -- M:N
  personaId, roleId, isDefault (bool), order

Role
  id, name, description, systemPrompt (text),
  defaultProviderId, defaultModel, defaultEffort ('low'|'medium'|'high'|'max'),
                                    -- new role default: 'high'
  toolPermissions (jsonb)           -- {read, edit, bash, webFetch, ...}
  ownerId, isWorkspaceShared,
  createdAt, updatedAt

RoleSkill                            -- M:N
  roleId, skillId

Skill
  id, name, description, frontmatter (jsonb), content (markdown text),
  compatibleProviders (text[]),     -- ['claude','codex','gemini']
  ownerId, isWorkspaceShared,
  createdAt, updatedAt
```

### 5.4 Plugins & MCP

```
Plugin                               -- Claude-only
  id, source ('claude_marketplace'|'manual_path'),
  name, version, config (jsonb),
  installStatus ('pending'|'installed'|'failed'),
  ownerId, createdAt, updatedAt

RolePlugin                           -- M:N
  roleId, pluginId, enabled

McpServer
  id, name, description,
  transport ('stdio'|'http'|'sse'),
  command, args (text[]),
  envEncrypted (jsonb)              -- {key: {ciphertext, iv, tag, keyVersion}}
  compatibleProviders (text[]),
  ownerId, isWorkspaceShared,
  createdAt, updatedAt

RoleMcp                              -- M:N
  roleId, mcpServerId, enabled
```

### 5.5 Slash commands

```
SlashCommand                         -- registry/cache
  id, source ('builtin'|'plugin'|'user'|'orchestrator'),
  providerId? (null = cross-provider),
  pluginId?, scope ('global'|'project'|'role'),
  name, description, template,
  ownerId
```

Sources of slash commands at runtime:
- `builtin` — discovered per provider on adapter init.
- `plugin` — discovered after plugin install per provider.
- `user` — `.claude/commands/*.md` in components, scanned on dispatch.
- `orchestrator` — registered in code: `/role-switch`, `/persona-switch`, `/cost`, `/agent-add`, etc.

### 5.6 Projects & Components

```
Project
  id, name, description, ownerId,
  createdAt, updatedAt

ProjectMembership                    -- team mode only
  projectId, userId, role ('owner'|'editor'|'viewer'),
  createdAt

Component
  id, projectId, name, path (absolute), description,
  envEncrypted (jsonb), order,
  createdAt, updatedAt
```

### 5.7 Tickets, Agents, Messages

```
Ticket
  id, projectId, title, description (initial prompt text),
  status ('open'|'queued'|'running'|'paused'|'done'|'archived'),
  mode ('interactive'|'autonomous'),
  componentSelectionMode ('manual'|'auto'),
  componentIds (uuid[]),
  primaryAgentId (fk → Agent),
  tags (text[]),
  ownerId, createdAt, updatedAt

Agent                                -- per-ticket session
  id, ticketId, personaId, activeRoleId,
  providerId, model, effort,        -- snapshot, overridable from role default
  cliSessionId (text, nullable),    -- claude/codex/gemini --resume id
  status ('idle'|'running'|'paused'|'failed'),
  displayColor (text),
  createdAt, updatedAt

AgentHandoff                         -- log
  id, ticketId, fromAgentId?, toAgentId, reason, createdAt

Message
  id, ticketId,
  senderType ('user'|'agent'|'system'),
  senderId (uuid),                  -- userId|agentId|null
  recipientType ('agent'|'broadcast'|null),
  recipientId? (uuid),
  content (markdown text),
  refs (jsonb)                      -- [{kind:'file', componentId, path, line?, range?}]
  createdAt

RunEvent                             -- raw stream + tool audit
  id, ticketId, agentId,
  type ('output'|'tool_use_start'|'tool_use_end'|'completion'|'error'|'cancel'),
  payload (jsonb),                  -- truncated for >50-line outputs
  createdAt
  -- retention: 30 days default (cron lazy delete), configurable per project
```

### 5.8 Attachments, Token usage, Audit

```
Attachment
  id, ticketId, messageId?,
  kind ('image'|'file'|'output_artifact'),
  filename, mimeType, size, storagePath,
  uploadedBy (userId|agentId), createdAt

TokenUsage
  id, messageId, provider, model,
  promptTokens, completionTokens, totalTokens,
  source ('reported'|'estimated'),
  createdAt

QuotaWindow                          -- track subscription budget
  id, userId, providerId, windowType ('5h'|'weekly'|'daily'),
  windowStart, windowEnd,
  tokensUsed, messageCount,
  capEstimate                       -- best known cap

AuditLog
  id, userId, action, targetType, targetId,
  ip, userAgent, createdAt, metadata (jsonb)
```

## 6. Core Flows

### 6.1 Dispatch Ticket (interactive)

```
1. User on Home / Project / Tickets clicks "Dispatch"
2. POST /api/tickets {projectId, personaId, activeRoleId, components[], mode:'interactive', initialPrompt, attachmentIds[]}
3. Next route handler:
   a. Authz check (project member or owner)
   b. INSERT Ticket(status='open') + INSERT Agent(personaId, role snapshot)
   c. POST /dispatch to Orchestrator with X-Internal-Token + X-User-Id
4. Orchestrator dispatch handler:
   a. Resolve role's skills, plugins (ensure installed), mcp servers (decrypt env)
   b. Build provider command via adapter (see 6.4)
   c. Spawn pty, register session, set Ticket.status='running'
   d. Subscribe pty events → write RunEvent rows + push to SSE topic /ticket:{id}
5. Browser opens /tickets/:id, GET /api/tickets/:id/stream → Next proxies SSE from orchestrator
6. User sees output stream live; types follow-up → POST /messages → orchestrator pty.write
```

### 6.2 Dispatch Ticket (autonomous)

```
1. POST /api/tickets {..., mode:'autonomous'}
2. Ticket(status='queued'), enqueue PgBoss job
3. Return 200 immediately; user may close browser
4. Worker picks job:
   a. Spawn pty in non-interactive mode (e.g., claude --print)
   b. Stream events to RunEvent + Message
   c. On completion: status='done', emit notification event
5. User returns:
   - In-app notification (SSE on /api/notifications/stream)
   - Optional desktop Web Notifications API (toggle in settings)
   - Ticket page replays full history from DB
```

### 6.3 Resume after restart

```
On orchestrator startup:
  - Tickets WHERE status='running':
      mode='interactive' → status='paused' (user clicks Resume to reattach)
      mode='autonomous'  → re-enqueue PgBoss job, pty respawn with --resume cliSessionId

User clicks Resume on paused ticket:
  → Spawn pty with --resume <cliSessionId>
  → CLI rebuilds context from provider-side cache (no token re-bill on subscription)
  → SSE reattaches; output continues
```

### 6.4 Provider adapter — buildCommand (claude example)

```ts
buildCommand(ctx) {
  const args = [
    ctx.agent.cliSessionId ? '--resume' : null,
    ctx.agent.cliSessionId ?? null,
    '--model', ctx.agent.model,
    '--system-prompt', composePrompt(ctx),     // see below
    ...ctx.role.plugins.flatMap(p => ['--plugin', p.name]),
    '--mcp-config', writeTempMcpJson(ctx.role.mcps, ctx.gatewayEndpoint),
    '--allowed-tools', allowedToolsString(ctx.role.toolPermissions),
  ].filter(Boolean)
  return { cmd: 'claude', args, cwd: chooseCwd(ctx), env: composeEnv(ctx) }
}

composePrompt(ctx) =
  ctx.persona.identityPrompt + '\n\n' +
  ctx.role.systemPrompt + '\n\n' +
  skillsSummaryBlock(ctx.role.skills) +     // descriptions only; bodies on demand
  componentsBlock(ctx.componentSelectionMode, ctx.components)
```

For codex/gemini, adapter handles equivalent flags; skills inline as system context if no native skill support; plugins skipped (claude-only).

### 6.5 Component auto-routing (mode B)

```
1. Spawn agent with prompt:
   "Available components:
    - user-frontend: <description>
    - user-backend: <description>
    User task: <prompt>
    First reply with JSON {components:['x','y']}, then proceed."
2. Parse first response → update Ticket.componentIds
3. Agent continues; cd into chosen components as needed
```

Trade-off: ~1 extra round-trip vs manual selection. Subscription cost-neutral but uses some quota energy. Default = manual; auto opt-in per ticket.

### 6.6 Multi-agent dispatch & routing

```
Add agent:
  - Click "+ Add Agent" in ticket header → modal: pick persona + role
  - INSERT Agent(ticketId, personaId, activeRoleId), spawn pty when first message arrives

Send message to specific agent:
  - User types "@Sam ..." in input → recipient parser sets Message.recipientId = Sam.id
  - Orchestrator routes via Sam's pty.write
  - Sam's stream → SSE channel includes senderId=Sam.id

Agent → agent:
  - When agent's reply contains @Mention, orchestrator parses → forwards as user-equivalent message into mentioned agent's pty
  - Both directions logged in Message/RunEvent

Broadcast:
  - "@all <message>" → fanout to every agent in ticket
```

### 6.7 File-edit conflict serialization

User explicitly retains control of agent execution; orchestrator does not block agent commands but DOES queue file-edit dispatches:

```
Message ingestion:
  parse refs[] from message body (@file syntax)
  for each ref.path:
    if any other agent currently owns lock on path (active Edit/Write tool call observed):
      enqueue this dispatch in path's FIFO queue
      respond UI: "Sam waiting on Alex (editing PromoCard.tsx)"
    else:
      acquire lock, dispatch, release on tool_use_end RunEvent (or 5-min TTL)

Limitation: native Edit/Write tools execute inside CLI process; orchestrator detects start/end via RunEvent observation, not interception. Lock is best-effort but reliable for serialized-by-message dispatch (which is the common case).
```

### 6.8 Slash commands `/`

```
User types '/' in chat input:
  Frontend GET /api/tickets/:id/slash-commands
    → orchestrator returns combined list:
       - provider builtins (cached per adapter init)
       - role's plugins' commands
       - workspace user-defined (.claude/commands/ scan)
       - orchestrator commands

User picks /role-switch backend → submit:
  Orchestrator middleware intercepts:
    if command is 'orchestrator' source → handle internally (e.g., update Agent.activeRoleId, inject role-switched system message into pty)
    else → write '/role-switch backend' to pty stdin (CLI handles)
```

## 7. UI Structure

### 7.1 Layout shell
- Left sidebar: New, Home, Projects, Tickets, divider, Personas, Roles, Skills, Plugins, MCP Servers, Settings; "Active sessions" widget at bottom.
- Top bar: workspace name, user menu, notifications icon.
- Main content area; optional right pane (file viewer / activity log / token usage).
- Cmd+K command palette: jump anywhere, dispatch, switch ticket/persona.
- Dark mode default with light option.

### 7.2 Pages

| Path | Purpose |
|---|---|
| `/login`, `/signup` | Auth.js flows; signup auto-disabled after first user (local) or invite-only (team) |
| `/` (Home) | Quick Dispatch widget (90% of usage), recent tickets, active sessions panel |
| `/projects` | List, create new (3-step wizard) |
| `/projects/:id` | Tabs: Components, Tickets, Members (team), Settings |
| `/tickets` | All tickets across projects, filters, status |
| `/tickets/:id` | **Main work surface** — chat thread + right pane (file viewer / activity log / tokens) |
| `/personas`, `/personas/:id` | Persona list + editor with attached roles |
| `/roles`, `/roles/:id` | Role editor (sysprompt, skills, plugins, mcp, tool permissions, defaults) |
| `/skills`, `/skills/:id` | Skill list + Monaco editor with markdown frontmatter; provider compatibility checker |
| `/plugins` | Marketplace + Installed tabs (claude only) |
| `/mcp` | MCP server registry, test connection, encrypted env management |
| `/settings` | Tabs: Providers, Models, Account, Usage, Security (audit), Advanced |

### 7.3 Ticket Detail (most-used surface)

Header: title, status badge, action menu, agent strip with avatars (color-coded), "+ Add Agent".

Main:
- Chat thread; messages tagged with sender (user / agent name + persona avatar / system).
- Refs render as inline clickable links (e.g., `[PromoCard.tsx:42](component:user-frontend/...)`).
- Attachments inline (image preview, file pill).
- File-edit conflict warnings as queue indicators ("Sam waiting on Alex").
- Slash command popup on `/`; @-mention popup on `@` (combined: file refs + agent names + slash commands by prefix detection).

Input area: multiline textarea, paste/drop image, recipient selector (defaults to primary), Pause/Cancel/Resume controls, Send.

Right pane (toggle):
- **File viewer** — Shiki syntax highlight, line numbers, jumps to line on ref click.
- **Activity log** — RunEvents grouped by agent, collapsible tool calls (Read/Edit/Bash arguments + truncated outputs).
- **Token usage** — running total; per-agent breakdown; cost-equivalent indicator (subscription "free" vs hypothetical API).

### 7.4 Quick Dispatch widget (Home)

- Multiline prompt
- Project dropdown
- Persona dropdown (auto-selects persona's default role; switchable)
- Components: checkbox list (manual) or "Auto-route" toggle
- Mode: Interactive | Autonomous
- Dispatch button → creates Ticket and navigates `/tickets/:id`

## 8. Authentication & Permissions

### 8.1 Modes

```
AUTH_MODE = none | local | team
```

| Mode | Login screen | Signup | Use |
|---|---|---|---|
| `none` | skipped, auto-default user | n/a | dev/throwaway |
| `local` (default) | yes | first user only, then disabled | personal |
| `team` | yes | invite-only, optional OAuth | shared deploy |

Switching modes requires a config flag, no schema migration.

### 8.2 Permission matrix

Local mode: every resource owner = sole user; UI hides sharing.

Team mode: workspace-shared toggle on Persona/Role/Skill/MCP; per-Project membership (`owner`/`editor`/`viewer`).

| Resource | Owner only by default | Workspace-share toggle | Per-project sharing |
|---|---|---|---|
| Project | yes | n/a | invite members |
| Component | inherits Project | n/a | inherits Project |
| Persona, Role, Skill | yes | yes (read-only for shared) | n/a |
| Plugin | per-user (Claude install) | n/a | n/a |
| MCP Server | yes | yes (use, not reveal secrets) | n/a |
| Ticket, Agent, Message | inherits Project | n/a | inherits Project |

### 8.3 Auth flow

Auth.js v5 with Prisma adapter; session cookies (DB-backed). Middleware (`apps/web/middleware.ts`) gates everything except `/login`, `/signup`, `/api/auth/*`. Route handlers call `getServerSession()` and verify resource ownership/membership before mutating.

Orchestrator boundary: Next.js calls orchestrator with headers `X-Internal-Token` (env-set shared secret) and `X-User-Id` (already authenticated user). Orchestrator trusts Next.js for auth and uses `userId` for `WHERE` filters in DB queries.

### 8.4 Secret encryption

`packages/shared/crypto.ts`:
```ts
encrypt(plaintext, key) → { ciphertext, iv, tag, keyVersion }
decrypt(record, key)    → plaintext
```
- AES-256-GCM via `node:crypto`.
- Key from `SECRET_KEY` env (32-byte base64).
- Stored ciphertext + IV + auth tag + key version; lazy re-encrypt on next access if key version differs (rotation).
- Reveal in UI is allowed (audit logged) — write operations require full re-entry.

### 8.5 Audit log

`AuditLog` table for security-sensitive actions: login, invite, MCP secret reveal, plugin install, permission change. Visible in Settings → Security (admins).

### 8.6 Rate limiting

- Login: 5/min per IP, 15-min lockout after 10 fails (LRU in-memory).
- Dispatch: 10/min per user (orchestrator queue check).
- MCP tool calls: inherit downstream MCP server's own limits.

## 9. Token-Saving Strategy

Layered, deterministic, observable.

### Layer 1 — Avoid

- **Subscription-first dispatch:** orchestrator tracks per-provider quota windows (claude max 5h+weekly, codex plus, gemini daily). Routing prefers providers with available budget.
- **Quota gauges** in Settings → Usage; warning toast at 80% per window.
- **Auto-fallback:** role config supports `primaryProvider` + `fallbackProvider`; at 80% quota, **suggest** (not auto-apply) fallback in UI.
- **Effort matching:** new role default = `high`; `Orchestrator-Coordinator` system role = `max`. Heuristic suggests `low` for short tasks (<200 char prompt, no refs).

### Layer 2 — Reuse

- **`--resume` always** when a ticket has prior `cliSessionId`; provider-side cache eliminates re-billed prompt tokens.
- **Stable prompt prefix:** persona identity → role sysprompt → skill summaries assembled in stable order so claude prompt caching hits.
- **MCP gateway tool catalog cache:** gateway returns same tool list for same role config; no re-listing on resume.

### Layer 3 — Shrink

- **File refs as paths only:** `@file.ts:42-58` ships path; agent reads on demand via native tool. No content dumped into prompts.
- **Skills on-demand:** system prompt includes skill descriptions only; full body loaded when slash-invoked or AI-triggered (Claude's SKILL discovery).
- **Component description summary:** mode B includes ≤200 tokens/component.
- **Tool filtering per role:** `--allowed-tools` reflects `Role.toolPermissions` to shrink tool spec.
- **MCP server filtering:** gateway exposes only role-attached servers' tools (typically 30-70% smaller catalog).
- **Auto-compact threshold:** at conversation > N tokens, toast suggests `/compact` (warn, never auto — compact is lossy).
- **RunEvent payload truncation:** stored output > 50 lines stores first/last + `[truncated]`. Marker stored in `payload.truncated` for replay UX.
- **Image compression:** uploads > 1MB resized + JPEG quality 85; toggle off in Settings (default on).

### Layer 4 — Observe

- **Per-message TokenUsage:** parsed from CLI's structured output where available (claude `--output-format json`); estimated otherwise.
- **Running total in ticket sidebar** with provider/model breakdown and "subscription: free" indicator.
- **Project soft caps** (Settings → Project → "Soft cap: N tokens/day") trigger warnings, never block.
- **Workspace dashboard** (Settings → Usage): tokens by day × provider × project × persona; skill/MCP usage heatmaps to identify bloat.

## 10. Testing Strategy

### 10.1 Pyramid

- **Unit (Vitest):** ~500 tests, 90%+ coverage on critical packages. Targets: `shared/`, `provider-adapters/`, `db/` helpers, orchestrator core, web utilities.
- **Integration (Vitest + testcontainers Postgres):** ~150 tests. Each test wrapped in transaction for fast isolation. Targets: auth, RBAC middleware, all CRUD endpoints, orchestrator HTTP API, MCP gateway, SSE, plugin install (mocked claude CLI), quota tracking, file-ref autocomplete.
- **E2E (Playwright):** ~30 critical flows with mock CLI. See 10.2 for the canonical 15.
- **Live provider tests:** gated by `RUN_LIVE_TESTS=1`, **nightly only**. Cheapest model + deterministic tasks (echo / 1+1 / file write). Validates real PTY connect + completion handling.

### 10.2 Critical E2E flows (must all pass for release)

| # | Flow |
|---|------|
| 1 | Signup → first user → dashboard |
| 2 | Create project + 2 components |
| 3 | Create skill + role + persona |
| 4 | Quick Dispatch → streaming output |
| 5 | Send follow-up message |
| 6 | `@`-mention file → ref renders clickable |
| 7 | `/`-slash command → executes |
| 8 | Multi-agent: 2 agents, @-mention routing |
| 9 | File conflict: 2nd agent queues until 1st done |
| 10 | Autonomous mode: dispatch → close → reopen → done |
| 11 | Restart orchestrator → resume from session id |
| 12 | Image paste upload → multimodal |
| 13 | MCP gateway: encrypted env injected, audit logged |
| 14 | Token tracker: live updates + threshold toast |
| 15 | Permission: viewer cannot dispatch |

### 10.3 Mock CLI

`tests/fixtures/mock-cli/index.ts` — Node script invoked as `mock-claude`/`mock-codex`/`mock-gemini`. Reads stdin (PTY) and emits scripted output sequences keyed by prompt fixtures. Deterministic, fast, covers tool-call shapes.

### 10.4 CI

GitHub Actions: lint+typecheck, unit, integration (postgres service), e2e (mock CLI) on every PR. Nightly cron: live provider tests on `main`.

### 10.5 Coverage gates

- Unit: 90% lines on `shared`, `provider-adapters`, `db`.
- Integration: every API endpoint has happy + unauthorized test.
- E2E: 15 flows = 100% pass.
- PRs reducing coverage > 2% blocked.

### 10.6 Test data

`packages/test-utils/factories/` builds Users, Projects, Components, Roles, Personas, Skills, Tickets via `@faker-js/faker`.

### 10.7 Test scripts

```bash
pnpm test                  # unit (watch in dev)
pnpm test:integration      # integration once
pnpm test:e2e              # e2e w/ mock cli
pnpm test:e2e:headed       # debug e2e visually
pnpm test:live             # nightly
pnpm test:all              # everything sequentially
```

## 11. Decisions Log

| # | Decision | Rationale |
|---|---|---|
| 1 | Subscription CLIs over API | Avoid per-token charges; flat-rate plans |
| 2 | 2 processes (Next + Orchestrator) | Prevent dev-reload killing subprocesses; clean scaling boundary |
| 3 | Postgres + PgBoss, no Redis | One dependency; PgBoss is sufficient up to ~100 jobs/sec |
| 4 | No Docker for local dev | Postgres.app is simpler for greenfield Mac users |
| 5 | Persona = group of roles, not single role | Matches user's mental model: "person with multiple hats" |
| 6 | Multi-agent in MVP | User explicitly requested |
| 7 | Parallel agents, user-controlled coordination | User retains control; orchestrator queues only file-edit dispatches |
| 8 | Universal MCP gateway in orchestrator | Single config across providers; secret never leaks to CLIs |
| 9 | AES-256-GCM secret encryption + reveal w/ audit | Standard, key versioning, lazy rotation |
| 10 | Auth.js v5 with mode flag (none/local/team) | One codebase, three deployments |
| 11 | Orchestrator trusts Next via X-Internal-Token + X-User-Id | Smaller attack surface; Next.js owns auth |
| 12 | Skills full body on-demand, descriptions in prompt | Major token saver; mirrors Claude SKILL discovery |
| 13 | File refs = path only (agent reads on demand) | No content duplication in prompts |
| 14 | RunEvent retention 30 days, configurable | Replay/debug w/o unbounded DB growth |
| 15 | Image compression default on, toggleable | Quality vs token trade-off; user can opt out |
| 16 | Auto-compact = warn, never auto | Compact is lossy; user judgment required |
| 17 | Auto-fallback = suggest, never auto | Switching providers loses context cache |
| 18 | New role default effort = `high`; `Orchestrator-Coordinator` = `max` | User preference |
| 19 | Live provider tests = nightly only | Quota friendly |
| 20 | Mock CLI = deterministic Node script | Faster, no quota burn, full PTY semantics |

## 12. Out of Scope (v1)

- Hosted SaaS deployment.
- Mobile-first responsive design.
- Native git/PR creation flows in UI (agents may use `git` via Bash).
- Voice input.
- Browser extension companion.
- Marketplace for sharing personas/roles/skills publicly.
- Advanced multi-agent strategies (manager pattern, debate pattern) — only @-routing in v1.

## 13. Open Items / Future Considerations

- **Workspace versioning:** snapshotting role/skill/persona configs so a ticket can replay against the exact config at dispatch time.
- **Cost simulation:** compare "what if API instead" running cost in Usage dashboard.
- **Observability hooks:** OpenTelemetry traces from dispatch through CLI subprocess (later).
- **Plugin sandboxing:** if a Claude plugin must be untrusted, what's the boundary? (Likely defer to Claude Code's own plugin sandbox.)
- **Conflict resolution UI:** when file-edit serialization fails (e.g., timeout), present user with diff to merge.
