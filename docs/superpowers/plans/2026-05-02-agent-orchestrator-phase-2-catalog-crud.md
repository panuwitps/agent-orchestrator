# Agent Orchestrator — Phase 2: Catalog CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full UI to manage Personas, Roles, Skills, Plugins, MCP Servers, Projects, and Components — owners can browse, create, edit, and delete every entity from the sidebar pages stubbed in Phase 1. No dispatch yet (Phase 3) and no team-mode sharing (deferred until team mode flips).

**Architecture:** All Phase 2 entities live in Postgres via Prisma. CRUD flows through three layers: **Repository** (`packages/db/src/repos/<entity>.ts`) wraps Prisma queries with auth-aware predicates; **Server actions** (`apps/web/app/<entity>/actions.ts`) validate inputs with Zod and call repositories; **App Router pages** (`apps/web/app/(app)/<entity>/...`) render lists, forms, and detail views using a small set of shared UI primitives. MCP server env vars are encrypted at rest using the AES-256-GCM helpers from `@ao/shared/crypto`.

**Tech Stack:** Same as Phase 1 (Next.js 15 + Auth.js v5 + Prisma + Hono + Vitest). Adds `vite-tsconfig-paths` for vitest path alias resolution and a small handful of shared UI primitives.

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-05-02-agent-orchestrator-design.md` (sections 5.3–5.6)
- Phase 1 plan (foundation reference): `docs/superpowers/plans/2026-05-02-agent-orchestrator-phase-1-foundation.md`
- Schema conventions (created in Task 1): `packages/db/prisma/CONVENTIONS.md`

**Prerequisite:** Phase 1 merged to `main`, `pnpm dev` boots both services, signup → login works.

---

## File Structure (created by this phase)

```
packages/db/
├── prisma/
│   ├── CONVENTIONS.md                          (new — Task 1)
│   └── schema.prisma                            (extended — Task 2)
└── src/
    ├── index.ts                                 (re-exports new repos)
    └── repos/                                   (new — Task 3)
        ├── persona.ts
        ├── role.ts
        ├── skill.ts
        ├── plugin.ts
        ├── mcp-server.ts
        ├── project.ts
        └── component.ts

packages/shared/
└── src/
    └── validators.ts                            (extended — Task 2)

apps/web/
├── lib/
│   ├── orchestrator-client.ts                   (new — Task 1, stub)
│   └── action-result.ts                         (new — Task 3)
├── components/
│   ├── data-table.tsx                           (new — Task 3)
│   ├── form-field.tsx                           (new — Task 3)
│   ├── confirm-dialog.tsx                       (new — Task 3)
│   └── secret-field.tsx                         (new — Task 7, MCP-only)
├── app/(app)/
│   ├── skills/
│   │   ├── page.tsx                             (replace placeholder)
│   │   ├── new/page.tsx
│   │   ├── [id]/edit/page.tsx
│   │   └── actions.ts
│   ├── roles/                                    (same structure)
│   ├── personas/                                 (same structure)
│   ├── mcp/                                      (same structure)
│   ├── plugins/                                  (same structure)
│   ├── projects/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx                        (project detail with components tab)
│   │   ├── [id]/edit/page.tsx
│   │   ├── [id]/components/new/page.tsx
│   │   ├── [id]/components/[componentId]/edit/page.tsx
│   │   └── actions.ts
│   └── settings/
│       ├── page.tsx                              (replace placeholder, redirects to providers)
│       └── providers/page.tsx                    (Task 11)
└── tests/integration/
    ├── skills.test.ts
    ├── roles.test.ts
    ├── personas.test.ts
    ├── mcp.test.ts
    ├── plugins.test.ts
    ├── projects.test.ts
    └── components.test.ts

vitest.config.ts                                  (modify — add vite-tsconfig-paths)
vitest.integration.config.ts                      (modify — add vite-tsconfig-paths)
```

**File responsibilities:**
- **Repositories** own all Prisma queries, take an `ownerId` and apply auth filtering. They never throw on permission errors — they return `null` so callers can decide how to surface 404 vs 403.
- **Server actions** own input validation (Zod) and call repositories. Return a discriminated union `Result<T>` from `lib/action-result.ts`.
- **App Router pages** own UI. They `await auth()` for the session and call repositories directly for SSR data; mutations go through server actions.
- **Shared UI primitives** (data-table, form-field, confirm-dialog) are intentionally minimal. shadcn/ui can be layered on later — keep Phase 2 dependency-light.
- **Encrypted secrets** are read via `secret-field.tsx` (Task 7); never round-trip through page HTML.

---

## Task 1: Phase 1 carry-over fixes

**Files:**
- Create: `packages/db/prisma/CONVENTIONS.md`
- Create: `apps/web/lib/orchestrator-client.ts`
- Modify: `apps/web/lib/auth.ts` (fix `AUTH_MODE=none` bootstrap)
- Modify: `vitest.config.ts`, `vitest.integration.config.ts` (add `vite-tsconfig-paths`)
- Modify: `apps/web/app/signup/actions.ts` (switch back to `@/` aliases once vitest can resolve them)

- [ ] **Step 1: Add `vite-tsconfig-paths` dev dep**

```bash
COREPACK_ENABLE_STRICT=0 pnpm add -D -w vite-tsconfig-paths
```

- [ ] **Step 2: Update `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const env = loadEnv('', process.cwd(), '')

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['packages/*/tests/**/*.test.ts', 'apps/*/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/integration/**'],
    environment: 'node',
    globals: false,
    env,
  },
})
```

- [ ] **Step 3: Update `vitest.integration.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const env = loadEnv('', process.cwd(), '')

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/integration/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    testTimeout: 30_000,
    env,
  },
})
```

- [ ] **Step 4: Switch `apps/web/app/signup/actions.ts` to `@/` aliases**

```ts
'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { resolveAuthMode, isSignupAllowed } from '@/lib/auth-mode'
import { SignupInput } from '@ao/shared'

type Result = { ok: true; userId: string } | { ok: false; error: string }

export async function signupAction(raw: unknown): Promise<Result> {
  const parsed = SignupInput.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'invalid input' }
  }
  const mode = resolveAuthMode()
  const existing = await prisma.user.count()
  if (!isSignupAllowed(mode, existing)) {
    return { ok: false, error: 'Signup is disabled in this mode' }
  }
  const hashed = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      hashedPassword: hashed,
      name: parsed.data.name,
      role: existing === 0 ? 'OWNER' : 'MEMBER',
    },
  })
  return { ok: true, userId: user.id }
}
```

(Also bumps bcrypt cost factor from 10 → 12 per Phase 1 review M10.)

- [ ] **Step 5: Run integration tests to verify aliases work**

Run: `COREPACK_ENABLE_STRICT=0 pnpm test:integration`
Expected: 3/3 still pass — signup test still resolves the action.

- [ ] **Step 6: Fix `AUTH_MODE=none` bootstrap in `apps/web/lib/auth.ts`**

The Phase 1 review (I3) noted that `AUTH_MODE=none` will lock the user out on a fresh DB because no user exists and signup is disabled. Replace the `none` branch in `authorize`:

```ts
if (mode === 'none') {
  let user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!user) {
    // First-run bootstrap: create a default OWNER so the app is usable.
    user = await prisma.user.create({
      data: {
        email: 'owner@local',
        name: 'Default Owner',
        role: 'OWNER',
      },
    })
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}
```

- [ ] **Step 7: Create `apps/web/lib/orchestrator-client.ts` (Phase 3 stub)**

```ts
const base = process.env.ORCHESTRATOR_URL ?? 'http://localhost:4000'
const token = process.env.INTERNAL_API_TOKEN

export type OrchestratorResponse<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

export async function callOrchestrator<T>(path: string, init: RequestInit = {}): Promise<OrchestratorResponse<T>> {
  if (!token) return { ok: false, status: 500, error: 'INTERNAL_API_TOKEN not configured' }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-internal-token': token,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { ok: false, status: res.status, error: body || `${res.status}` }
  }
  return { ok: true, data: (await res.json()) as T }
}
```

- [ ] **Step 8: Write `packages/db/prisma/CONVENTIONS.md`**

```markdown
# Prisma schema conventions

These conventions apply to every model added in Phase 2 onward.

## Naming
- Model name: PascalCase singular (`Persona`, `Project`, `RoleSkill`).
- Table name (`@@map`): snake_case plural (`personas`, `projects`, `role_skills`).
- Field names: camelCase. Auth.js OAuth fields are an exception (snake_case `refresh_token` etc.) because Auth.js writes them in OAuth wire format.
- Foreign keys: `<related>Id` (e.g., `personaId`, `roleId`).

## IDs
- Primary keys: `String @id @default(cuid())`.
- Junction tables: composite PK on the two FKs unless you genuinely need a row id.

## Timestamps
- `createdAt DateTime @default(now())`.
- `updatedAt DateTime @updatedAt` if the row is mutable.
- Junction tables can omit timestamps unless audit-relevant.

## Indexes
- Every FK column on the *referencing* side gets `@@index([userId])` (or whatever the FK is) — Postgres does not auto-index FK referencing columns, and cascade deletes seq-scan otherwise.
- Add composite indexes when a field is consistently filtered together with another (e.g., `@@index([projectId, archived])`).

## Ownership and sharing
- Every user-facing entity has `ownerId String` referencing User.
- Add `isWorkspaceShared Boolean @default(false)` on entities that can be promoted to workspace-shared in team mode.
- Many-to-many junction tables don't need ownership — they inherit from their parents.

## Encrypted columns
- Store as `Json` with the `EncryptedRecord` shape from `@ao/shared/crypto`: `{ ciphertext, iv, tag, keyVersion }`.
- Never log the column value. Read paths must go through a single helper that decrypts on demand.

## Cascade behavior
- `User` deletion cascades to OAuth `Account`, `Session`. Other user-owned entities CASCADE on `ownerId` so a user delete cleans up their catalog.
- `Project` deletion cascades to `Component`, `Ticket`, `Agent`, `Message`.
- `Persona`/`Role` deletion does not cascade to junction tables — `onDelete: Restrict` so the user must un-attach first (prevents accidental data loss when a heavily-used role is deleted by mistake).
```

- [ ] **Step 9: Run all tests + typecheck**

```bash
COREPACK_ENABLE_STRICT=0 pnpm test
COREPACK_ENABLE_STRICT=0 pnpm test:integration
COREPACK_ENABLE_STRICT=0 pnpm -r typecheck
```
Expected: 14 unit pass, 3 integration pass, all packages typecheck.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: Phase 1 carry-over fixes (path aliases, conventions, AUTH_MODE=none bootstrap)"
```

---

## Task 2: Phase 2 schema additions

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/seed.ts`
- Modify: `packages/db/package.json` (add `seed` script)
- Modify: `packages/shared/src/validators.ts` (Zod for new entities)

- [ ] **Step 1: Append to `packages/db/prisma/schema.prisma`**

Add the following blocks at the end of the file:

```prisma
// ----- Provider catalog (seeded) -----

model Provider {
  id              String   @id @default(cuid())
  slug            String   @unique         // 'claude' | 'codex' | 'gemini'
  name            String
  cliCommand      String                  // 'claude' | 'codex' | 'gemini'
  supportsSkills  Boolean  @default(false)
  supportsPlugins Boolean  @default(false)
  supportsMcp     Boolean  @default(true)
  models          Json                    // [{id, name, effortLevels:[]}]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  defaultRoles  Role[]      @relation("RoleDefaultProvider")
  plugins       Plugin[]
  rolePlugins   RolePlugin[]

  @@map("providers")
}

// ----- Skills -----

model Skill {
  id                   String   @id @default(cuid())
  name                 String
  description          String
  frontmatter          Json     @default("{}")
  content              String
  compatibleProviders  String[]                       // e.g. ['claude','codex','gemini']
  ownerId              String
  isWorkspaceShared    Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  owner User @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  roles RoleSkill[]

  @@unique([ownerId, name])
  @@index([ownerId])
  @@map("skills")
}

// ----- Roles -----

model Role {
  id                String   @id @default(cuid())
  name              String
  description       String
  systemPrompt      String
  defaultProviderId String?
  defaultModel      String?
  defaultEffort     Effort   @default(HIGH)
  toolPermissions   Json     @default("{\"read\":true,\"edit\":true,\"bash\":true,\"webFetch\":true}")
  ownerId           String
  isWorkspaceShared Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  owner           User        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  defaultProvider Provider?   @relation("RoleDefaultProvider", fields: [defaultProviderId], references: [id])
  skills          RoleSkill[]
  plugins         RolePlugin[]
  mcps            RoleMcp[]
  personas        PersonaRole[]

  @@unique([ownerId, name])
  @@index([ownerId])
  @@map("roles")
}

enum Effort {
  LOW
  MEDIUM
  HIGH
  MAX
}

model RoleSkill {
  roleId  String
  skillId String

  role  Role  @relation(fields: [roleId], references: [id], onDelete: Cascade)
  skill Skill @relation(fields: [skillId], references: [id], onDelete: Restrict)

  @@id([roleId, skillId])
  @@index([skillId])
  @@map("role_skills")
}

// ----- Personas -----

model Persona {
  id                String   @id @default(cuid())
  name              String
  description       String
  identityPrompt    String
  avatarUrl         String?
  ownerId           String
  isWorkspaceShared Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  owner User          @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  roles PersonaRole[]

  @@unique([ownerId, name])
  @@index([ownerId])
  @@map("personas")
}

model PersonaRole {
  personaId String
  roleId    String
  isDefault Boolean  @default(false)
  order     Int      @default(0)

  persona Persona @relation(fields: [personaId], references: [id], onDelete: Cascade)
  role    Role    @relation(fields: [roleId], references: [id], onDelete: Restrict)

  @@id([personaId, roleId])
  @@index([roleId])
  @@map("persona_roles")
}

// ----- Plugins (Claude only) -----

model Plugin {
  id            String   @id @default(cuid())
  source        String   // 'claude_marketplace' | 'manual_path'
  name          String
  version       String
  config        Json     @default("{}")
  installStatus String   @default("pending") // pending | installed | failed
  providerId    String   // always claude in Phase 2
  ownerId       String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  owner    User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  provider Provider     @relation(fields: [providerId], references: [id])
  roles    RolePlugin[]

  @@unique([ownerId, providerId, name])
  @@index([ownerId])
  @@map("plugins")
}

model RolePlugin {
  roleId     String
  pluginId   String
  providerId String
  enabled    Boolean @default(true)

  role     Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  plugin   Plugin   @relation(fields: [pluginId], references: [id], onDelete: Cascade)
  provider Provider @relation(fields: [providerId], references: [id])

  @@id([roleId, pluginId])
  @@index([pluginId])
  @@map("role_plugins")
}

// ----- MCP servers -----

model McpServer {
  id                  String   @id @default(cuid())
  name                String
  description         String
  transport           String   // 'stdio' | 'http' | 'sse'
  command             String?  // for stdio
  args                String[] @default([])
  url                 String?  // for http/sse
  envEncrypted        Json     @default("{}")  // {KEY: EncryptedRecord}
  compatibleProviders String[]
  ownerId             String
  isWorkspaceShared   Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  owner User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  roles RoleMcp[]

  @@unique([ownerId, name])
  @@index([ownerId])
  @@map("mcp_servers")
}

model RoleMcp {
  roleId      String
  mcpServerId String
  enabled     Boolean @default(true)

  role      Role      @relation(fields: [roleId], references: [id], onDelete: Cascade)
  mcpServer McpServer @relation(fields: [mcpServerId], references: [id], onDelete: Cascade)

  @@id([roleId, mcpServerId])
  @@index([mcpServerId])
  @@map("role_mcps")
}

// ----- Projects + Components -----

model Project {
  id          String   @id @default(cuid())
  name        String
  description String
  ownerId     String
  archived    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner       User                @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  components  Component[]
  memberships ProjectMembership[]

  @@unique([ownerId, name])
  @@index([ownerId])
  @@map("projects")
}

model ProjectMembership {
  projectId String
  userId    String
  role      ProjectRole @default(EDITOR)
  createdAt DateTime    @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([projectId, userId])
  @@index([userId])
  @@map("project_memberships")
}

enum ProjectRole {
  OWNER
  EDITOR
  VIEWER
}

model Component {
  id            String   @id @default(cuid())
  projectId     String
  name          String
  path          String                                    // absolute filesystem path
  description   String
  envEncrypted  Json     @default("{}")
  order         Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, name])
  @@index([projectId])
  @@map("components")
}
```

Also extend the existing `User` model to back the new relations. Find the `User` block and replace its body with:

```prisma
model User {
  id             String    @id @default(cuid())
  email          String    @unique
  name           String?
  hashedPassword String?
  role           UserRole  @default(MEMBER)
  emailVerified  DateTime?
  image          String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  accounts           Account[]
  sessions           Session[]
  skills             Skill[]
  roles              Role[]
  personas           Persona[]
  plugins            Plugin[]
  mcpServers         McpServer[]
  projects           Project[]
  projectMemberships ProjectMembership[]

  @@map("users")
}
```

- [ ] **Step 2: Run migration**

```bash
COREPACK_ENABLE_STRICT=0 pnpm --filter @ao/db exec prisma migrate dev --name phase2_catalog
```

Verify:
```bash
psql -d agent_orchestrator -c '\dt'
```
Expected new tables: `providers`, `skills`, `roles`, `role_skills`, `personas`, `persona_roles`, `plugins`, `role_plugins`, `mcp_servers`, `role_mcps`, `projects`, `project_memberships`, `components`.

- [ ] **Step 3: Create `packages/db/prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PROVIDERS = [
  {
    slug: 'claude',
    name: 'Claude',
    cliCommand: 'claude',
    supportsSkills: true,
    supportsPlugins: true,
    supportsMcp: true,
    models: [
      { id: 'opus', name: 'Opus', effortLevels: ['low', 'medium', 'high', 'max'] },
      { id: 'sonnet', name: 'Sonnet', effortLevels: ['low', 'medium', 'high', 'max'] },
      { id: 'haiku', name: 'Haiku', effortLevels: ['low', 'medium', 'high'] },
    ],
  },
  {
    slug: 'codex',
    name: 'Codex (ChatGPT)',
    cliCommand: 'codex',
    supportsSkills: false,
    supportsPlugins: false,
    supportsMcp: true,
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', effortLevels: ['low', 'medium', 'high'] },
      { id: 'gpt-4o', name: 'GPT-4o', effortLevels: ['low', 'medium'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', effortLevels: ['low'] },
    ],
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    cliCommand: 'gemini',
    supportsSkills: false,
    supportsPlugins: false,
    supportsMcp: true,
    models: [
      { id: '2.0-pro', name: 'Gemini 2.0 Pro', effortLevels: ['low', 'medium', 'high'] },
      { id: '2.0-flash', name: 'Gemini 2.0 Flash', effortLevels: ['low', 'medium'] },
    ],
  },
]

async function main() {
  for (const p of PROVIDERS) {
    await prisma.provider.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        cliCommand: p.cliCommand,
        supportsSkills: p.supportsSkills,
        supportsPlugins: p.supportsPlugins,
        supportsMcp: p.supportsMcp,
        models: p.models,
      },
      create: p,
    })
  }
  const count = await prisma.provider.count()
  console.log(`Seeded ${count} providers`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Add seed script to `packages/db/package.json`**

Add `"db:seed": "tsx prisma/seed.ts"` to `scripts`. Add `"prisma": { "seed": "tsx prisma/seed.ts" }` at the top level (Prisma's expected location). Final shape:

```json
{
  "name": "@ao/db",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prisma": "prisma",
    "db:seed": "tsx prisma/seed.ts",
    "lint": "echo 'no lint configured'"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "tsx": "^4.16.0"
  }
}
```

- [ ] **Step 5: Run seed**

```bash
COREPACK_ENABLE_STRICT=0 pnpm --filter @ao/db db:seed
```

Verify:
```bash
psql -d agent_orchestrator -c "SELECT slug, name FROM providers ORDER BY slug;"
```
Expected: 3 rows for claude/codex/gemini.

- [ ] **Step 6: Extend `packages/shared/src/validators.ts`**

Add at the bottom:

```ts
import { z as Z } from 'zod'

export const Effort = Z.enum(['low', 'medium', 'high', 'max'])
export type Effort = Z.infer<typeof Effort>

export const SkillInput = Z.object({
  name: NonEmptyString,
  description: Z.string().max(1000),
  content: Z.string().max(100_000),
  frontmatter: Z.record(Z.unknown()).default({}),
  compatibleProviders: Z.array(Z.string()).default([]),
})
export type SkillInput = Z.infer<typeof SkillInput>

export const RoleInput = Z.object({
  name: NonEmptyString,
  description: Z.string().max(1000),
  systemPrompt: Z.string().max(50_000),
  defaultProviderId: Z.string().nullable().optional(),
  defaultModel: Z.string().nullable().optional(),
  defaultEffort: Effort.default('high'),
  toolPermissions: Z.object({
    read: Z.boolean().default(true),
    edit: Z.boolean().default(true),
    bash: Z.boolean().default(true),
    webFetch: Z.boolean().default(true),
  }).default({ read: true, edit: true, bash: true, webFetch: true }),
  skillIds: Z.array(Z.string()).default([]),
})
export type RoleInput = Z.infer<typeof RoleInput>

export const PersonaInput = Z.object({
  name: NonEmptyString,
  description: Z.string().max(1000),
  identityPrompt: Z.string().max(20_000),
  avatarUrl: Z.string().url().nullable().optional(),
  roleIds: Z.array(Z.string()).default([]),
  defaultRoleId: Z.string().nullable().optional(),
})
export type PersonaInput = Z.infer<typeof PersonaInput>

export const PluginInput = Z.object({
  name: NonEmptyString,
  version: Z.string().max(64).default('latest'),
  source: Z.enum(['claude_marketplace', 'manual_path']).default('claude_marketplace'),
  config: Z.record(Z.unknown()).default({}),
})
export type PluginInput = Z.infer<typeof PluginInput>

export const McpServerInput = Z.object({
  name: NonEmptyString,
  description: Z.string().max(1000),
  transport: Z.enum(['stdio', 'http', 'sse']),
  command: Z.string().nullable().optional(),
  args: Z.array(Z.string()).default([]),
  url: Z.string().url().nullable().optional(),
  env: Z.record(Z.string()).default({}),               // plaintext at edit time; encrypted on store
  compatibleProviders: Z.array(Z.string()).default([]),
})
export type McpServerInput = Z.infer<typeof McpServerInput>

export const ProjectInput = Z.object({
  name: NonEmptyString,
  description: Z.string().max(1000),
})
export type ProjectInput = Z.infer<typeof ProjectInput>

export const ComponentInput = Z.object({
  name: NonEmptyString,
  path: Z.string().min(1).max(1024),
  description: Z.string().max(1000),
  env: Z.record(Z.string()).default({}),
})
export type ComponentInput = Z.infer<typeof ComponentInput>
```

- [ ] **Step 7: Run all tests + typecheck**

```bash
COREPACK_ENABLE_STRICT=0 pnpm test
COREPACK_ENABLE_STRICT=0 pnpm test:integration
COREPACK_ENABLE_STRICT=0 pnpm -r typecheck
```
Expected: still 14 unit + 3 integration pass; typecheck clean (Prisma client is regenerated by `migrate dev`).

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat(db): Phase 2 schema + seed providers + zod inputs for catalog entities"
```

---

## Task 3: Shared CRUD primitives

**Files:**
- Create: `apps/web/lib/action-result.ts`
- Create: `apps/web/components/data-table.tsx`
- Create: `apps/web/components/form-field.tsx`
- Create: `apps/web/components/confirm-dialog.tsx`
- Create: `apps/web/lib/repos.ts` (re-export Phase 2 repos for convenience)
- Create: `packages/db/src/repos/index.ts` (barrel)

- [ ] **Step 1: `apps/web/lib/action-result.ts`**

```ts
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
export const fail = <T = never>(error: string): ActionResult<T> => ({ ok: false, error })
```

- [ ] **Step 2: `apps/web/components/data-table.tsx`**

```tsx
import Link from 'next/link'
import type { Route } from 'next'

export type Column<T> = {
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowHref,
  emptyMessage = 'No items yet.',
}: {
  rows: T[]
  columns: Column<T>[]
  rowHref?: (row: T) => Route
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-white/10 p-8 text-center text-sm opacity-60">
        {emptyMessage}
      </div>
    )
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-white/10 text-left">
          {columns.map((c) => (
            <th key={c.header} className={`px-3 py-2 font-medium opacity-70 ${c.className ?? ''}`}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const inner = columns.map((c, j) => (
            <td key={j} className={`px-3 py-2 ${c.className ?? ''}`}>
              {c.cell(row)}
            </td>
          ))
          return (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
              {rowHref ? (
                <td colSpan={columns.length} className="p-0">
                  <Link href={rowHref(row)} className="block">
                    <div className="flex">{inner}</div>
                  </Link>
                </td>
              ) : (
                inner
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: `apps/web/components/form-field.tsx`**

```tsx
export function FormField({
  label,
  name,
  required,
  type = 'text',
  defaultValue,
  placeholder,
  hint,
}: {
  label: string
  name: string
  required?: boolean
  type?: 'text' | 'email' | 'url' | 'number'
  defaultValue?: string | number
  placeholder?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm opacity-70">{label}{required && <span className="text-red-400"> *</span>}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2"
      />
      {hint && <span className="mt-1 block text-xs opacity-50">{hint}</span>}
    </label>
  )
}

export function TextArea({
  label,
  name,
  required,
  defaultValue,
  placeholder,
  rows = 4,
  hint,
}: {
  label: string
  name: string
  required?: boolean
  defaultValue?: string
  placeholder?: string
  rows?: number
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm opacity-70">{label}{required && <span className="text-red-400"> *</span>}</span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm"
      />
      {hint && <span className="mt-1 block text-xs opacity-50">{hint}</span>}
    </label>
  )
}
```

- [ ] **Step 4: `apps/web/components/confirm-dialog.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function ConfirmDeleteButton({
  action,
  label = 'Delete',
  confirm = 'Are you sure?',
}: {
  action: (formData: FormData) => void
  label?: string
  confirm?: string
}) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded border border-red-500/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"
      >
        {label}
      </button>
    )
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <span className="text-sm text-red-300">{confirm}</span>
      <button
        type="submit"
        className="rounded bg-red-500/30 px-3 py-1.5 text-sm font-medium hover:bg-red-500/40"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
      >
        Cancel
      </button>
    </form>
  )
}
```

- [ ] **Step 5: `packages/db/src/repos/index.ts` (barrel)**

```ts
export * from './skill'
export * from './role'
export * from './persona'
export * from './plugin'
export * from './mcp-server'
export * from './project'
export * from './component'
```

(Files don't exist yet — Tasks 4-10 add them. The barrel will fail typecheck until then; that's expected.)

- [ ] **Step 6: Skip — barrel will be populated by subsequent tasks**

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/action-result.ts apps/web/components/ packages/db/src/repos/index.ts
git commit -m "feat(web): shared CRUD primitives (data-table, form-field, confirm-dialog, action-result)"
```

(The repo barrel is committed but not yet exported from `packages/db/src/index.ts` — Tasks 4-10 populate it; an unused-but-existing file is harmless.)

---

## Task 4: Skills CRUD

**Files:**
- Create: `packages/db/src/repos/skill.ts`
- Create: `apps/web/app/(app)/skills/page.tsx` (replaces placeholder)
- Create: `apps/web/app/(app)/skills/actions.ts`
- Create: `apps/web/app/(app)/skills/new/page.tsx`
- Create: `apps/web/app/(app)/skills/[id]/edit/page.tsx`
- Create: `apps/web/tests/integration/skills.test.ts`

- [ ] **Step 1: Write failing integration test `apps/web/tests/integration/skills.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@ao/db'
import { createSkillAction, updateSkillAction, deleteSkillAction } from '@/app/(app)/skills/actions'
import { listSkillsForOwner } from '@ao/db'

async function makeOwner() {
  return prisma.user.create({
    data: { email: `t+${Date.now()}@t.com`, role: 'OWNER' },
  })
}

describe('skills CRUD', () => {
  beforeEach(async () => {
    await prisma.roleSkill.deleteMany()
    await prisma.skill.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates a skill owned by the current user', async () => {
    const u = await makeOwner()
    const res = await createSkillAction(u.id, {
      name: 'tdd',
      description: 'TDD workflow',
      content: '# TDD\n\nRed-Green-Refactor.',
      frontmatter: { trigger: 'tests' },
      compatibleProviders: ['claude'],
    })
    expect(res.ok).toBe(true)
    const list = await listSkillsForOwner(u.id)
    expect(list).toHaveLength(1)
    expect(list[0]!.name).toBe('tdd')
  })

  it('rejects duplicate name for same owner', async () => {
    const u = await makeOwner()
    await createSkillAction(u.id, {
      name: 'dup', description: '', content: 'x', frontmatter: {}, compatibleProviders: [],
    })
    const res = await createSkillAction(u.id, {
      name: 'dup', description: '', content: 'y', frontmatter: {}, compatibleProviders: [],
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.toLowerCase()).toContain('already exists')
  })

  it('updates and deletes', async () => {
    const u = await makeOwner()
    const created = await createSkillAction(u.id, {
      name: 's1', description: 'd', content: 'c', frontmatter: {}, compatibleProviders: [],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updateSkillAction(u.id, created.data.id, {
      name: 's1', description: 'd2', content: 'c', frontmatter: {}, compatibleProviders: ['codex'],
    })
    expect(upd.ok).toBe(true)
    const del = await deleteSkillAction(u.id, created.data.id)
    expect(del.ok).toBe(true)
    expect(await listSkillsForOwner(u.id)).toHaveLength(0)
  })
})
```

Run: `pnpm test:integration apps/web/tests/integration/skills.test.ts`
Expected: cannot resolve `@/app/(app)/skills/actions` and `@ao/db` symbols.

- [ ] **Step 2: Implement `packages/db/src/repos/skill.ts`**

```ts
import { prisma } from '../index'
import type { Skill } from '@prisma/client'

export type SkillCreateInput = {
  name: string
  description: string
  content: string
  frontmatter: Record<string, unknown>
  compatibleProviders: string[]
}

export async function listSkillsForOwner(ownerId: string): Promise<Skill[]> {
  return prisma.skill.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
  })
}

export async function getSkillForOwner(ownerId: string, id: string): Promise<Skill | null> {
  return prisma.skill.findFirst({ where: { id, ownerId } })
}

export async function createSkill(ownerId: string, input: SkillCreateInput): Promise<Skill> {
  return prisma.skill.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      content: input.content,
      frontmatter: input.frontmatter as object,
      compatibleProviders: input.compatibleProviders,
    },
  })
}

export async function updateSkill(
  ownerId: string,
  id: string,
  input: SkillCreateInput,
): Promise<Skill | null> {
  const existing = await getSkillForOwner(ownerId, id)
  if (!existing) return null
  return prisma.skill.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      content: input.content,
      frontmatter: input.frontmatter as object,
      compatibleProviders: input.compatibleProviders,
    },
  })
}

export async function deleteSkill(ownerId: string, id: string): Promise<boolean> {
  const existing = await getSkillForOwner(ownerId, id)
  if (!existing) return false
  await prisma.skill.delete({ where: { id } })
  return true
}
```

- [ ] **Step 3: Update `packages/db/src/index.ts` to re-export repos**

```ts
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export * from '@prisma/client'
export * from './repos'
```

- [ ] **Step 4: Implement `apps/web/app/(app)/skills/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import {
  createSkill,
  updateSkill,
  deleteSkill,
  type SkillCreateInput,
} from '@ao/db'
import { SkillInput } from '@ao/shared'

async function ownerId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function createSkillAction(
  callerId: string | null,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const uid = callerId ?? (await ownerId())
  if (!uid) return fail('not authenticated')
  const parsed = SkillInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  try {
    const skill = await createSkill(uid, parsed.data as SkillCreateInput)
    revalidatePath('/skills')
    return ok({ id: skill.id })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return fail('A skill with this name already exists')
    throw e
  }
}

export async function updateSkillAction(
  callerId: string | null,
  id: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const uid = callerId ?? (await ownerId())
  if (!uid) return fail('not authenticated')
  const parsed = SkillInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  const updated = await updateSkill(uid, id, parsed.data as SkillCreateInput)
  if (!updated) return fail('not found')
  revalidatePath('/skills')
  revalidatePath(`/skills/${id}/edit`)
  return ok({ id: updated.id })
}

export async function deleteSkillAction(
  callerId: string | null,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const uid = callerId ?? (await ownerId())
  if (!uid) return fail('not authenticated')
  const deleted = await deleteSkill(uid, id)
  if (!deleted) return fail('not found')
  revalidatePath('/skills')
  return ok({ id })
}
```

> The `callerId | null` first arg is for tests that bypass `auth()`. In real form actions, pass `null` and the action uses the session.

- [ ] **Step 5: Replace `apps/web/app/(app)/skills/page.tsx`**

```tsx
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listSkillsForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'
import type { Skill } from '@ao/db'

export default async function SkillsPage() {
  const session = await auth()
  const skills = session?.user?.id ? await listSkillsForOwner(session.user.id) : []

  const columns: Column<Skill>[] = [
    { header: 'Name', cell: (s) => <span className="font-medium">{s.name}</span> },
    { header: 'Description', cell: (s) => <span className="opacity-80">{s.description}</span> },
    {
      header: 'Providers',
      cell: (s) => (
        <span className="opacity-60 text-xs">
          {s.compatibleProviders.length > 0 ? s.compatibleProviders.join(', ') : '—'}
        </span>
      ),
    },
  ]

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Skills</h1>
        <Link
          href="/skills/new"
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500"
        >
          + New skill
        </Link>
      </div>
      <DataTable
        rows={skills}
        columns={columns}
        rowHref={(s) => `/skills/${s.id}/edit`}
        emptyMessage="No skills yet. Create your first to teach a role a behavior."
      />
    </main>
  )
}
```

- [ ] **Step 6: Create `apps/web/app/(app)/skills/new/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { FormField, TextArea } from '@/components/form-field'
import { createSkillAction } from '../actions'

export default function NewSkillPage() {
  async function submit(formData: FormData) {
    'use server'
    const res = await createSkillAction(null, {
      name: formData.get('name'),
      description: formData.get('description'),
      content: formData.get('content'),
      frontmatter: tryJson(formData.get('frontmatter')),
      compatibleProviders: parseCsv(formData.get('compatibleProviders')),
    })
    if (res.ok) redirect('/skills')
  }
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New skill</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="test-driven-development" />
        <FormField label="Description" name="description" required />
        <FormField
          label="Compatible providers (comma separated)"
          name="compatibleProviders"
          placeholder="claude, codex, gemini"
        />
        <FormField
          label="Frontmatter (JSON object)"
          name="frontmatter"
          placeholder='{"trigger": "tests"}'
          hint="Optional. Stored as-is on the skill."
        />
        <TextArea label="Content (Markdown)" name="content" required rows={16} />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">
          Create
        </button>
      </form>
    </main>
  )
}

function tryJson(v: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof v !== 'string' || v.trim() === '') return {}
  try {
    const parsed = JSON.parse(v)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function parseCsv(v: FormDataEntryValue | null): string[] {
  if (typeof v !== 'string') return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
```

- [ ] **Step 7: Create `apps/web/app/(app)/skills/[id]/edit/page.tsx`**

```tsx
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getSkillForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { updateSkillAction, deleteSkillAction } from '../../actions'

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const skill = await getSkillForOwner(session.user.id, id)
  if (!skill) notFound()

  async function save(formData: FormData) {
    'use server'
    const res = await updateSkillAction(null, id, {
      name: formData.get('name'),
      description: formData.get('description'),
      content: formData.get('content'),
      frontmatter: tryJson(formData.get('frontmatter')),
      compatibleProviders: parseCsv(formData.get('compatibleProviders')),
    })
    if (res.ok) redirect('/skills')
  }
  async function remove() {
    'use server'
    await deleteSkillAction(null, id)
    redirect('/skills')
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Edit skill</h1>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={skill.name} />
        <FormField label="Description" name="description" required defaultValue={skill.description} />
        <FormField
          label="Compatible providers (comma separated)"
          name="compatibleProviders"
          defaultValue={skill.compatibleProviders.join(', ')}
        />
        <FormField
          label="Frontmatter (JSON object)"
          name="frontmatter"
          defaultValue={JSON.stringify(skill.frontmatter, null, 2)}
        />
        <TextArea label="Content (Markdown)" name="content" required rows={16} defaultValue={skill.content} />
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">
            Save
          </button>
          <ConfirmDeleteButton action={remove} />
        </div>
      </form>
    </main>
  )
}

function tryJson(v: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof v !== 'string' || v.trim() === '') return {}
  try {
    const parsed = JSON.parse(v)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function parseCsv(v: FormDataEntryValue | null): string[] {
  if (typeof v !== 'string') return []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}
```

- [ ] **Step 8: Run integration test (expect 3/3 pass)**

```bash
COREPACK_ENABLE_STRICT=0 pnpm test:integration apps/web/tests/integration/skills.test.ts
```

- [ ] **Step 9: Run typecheck**

```bash
COREPACK_ENABLE_STRICT=0 pnpm -r typecheck
```

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat(web): Skills CRUD (list/new/edit/delete) with integration tests"
```

---

## Task 5: Roles CRUD

The Roles CRUD follows the exact same pattern as Skills (Task 4) plus a multi-skill picker on the form. The complete implementation steps are below — repeated in full per the plan's no-shortcuts rule.

**Files:**
- Create: `packages/db/src/repos/role.ts`
- Replace: `apps/web/app/(app)/roles/page.tsx`
- Create: `apps/web/app/(app)/roles/actions.ts`
- Create: `apps/web/app/(app)/roles/new/page.tsx`
- Create: `apps/web/app/(app)/roles/[id]/edit/page.tsx`
- Create: `apps/web/components/skill-picker.tsx`
- Create: `apps/web/tests/integration/roles.test.ts`

- [ ] **Step 1: Implement `packages/db/src/repos/role.ts`**

```ts
import { prisma } from '../index'
import type { Role, Effort } from '@prisma/client'

export type RoleCreateInput = {
  name: string
  description: string
  systemPrompt: string
  defaultProviderId?: string | null
  defaultModel?: string | null
  defaultEffort: Effort
  toolPermissions: { read: boolean; edit: boolean; bash: boolean; webFetch: boolean }
  skillIds: string[]
}

export async function listRolesForOwner(ownerId: string) {
  return prisma.role.findMany({
    where: { ownerId },
    include: { skills: { include: { skill: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getRoleForOwner(ownerId: string, id: string) {
  return prisma.role.findFirst({
    where: { id, ownerId },
    include: { skills: { include: { skill: true } } },
  })
}

export async function createRole(ownerId: string, input: RoleCreateInput): Promise<Role> {
  return prisma.role.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      defaultProviderId: input.defaultProviderId ?? null,
      defaultModel: input.defaultModel ?? null,
      defaultEffort: input.defaultEffort,
      toolPermissions: input.toolPermissions as object,
      skills: {
        create: input.skillIds.map((skillId) => ({ skillId })),
      },
    },
  })
}

export async function updateRole(ownerId: string, id: string, input: RoleCreateInput): Promise<Role | null> {
  const existing = await getRoleForOwner(ownerId, id)
  if (!existing) return null
  return prisma.role.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      defaultProviderId: input.defaultProviderId ?? null,
      defaultModel: input.defaultModel ?? null,
      defaultEffort: input.defaultEffort,
      toolPermissions: input.toolPermissions as object,
      skills: {
        deleteMany: {},
        create: input.skillIds.map((skillId) => ({ skillId })),
      },
    },
  })
}

export async function deleteRole(ownerId: string, id: string): Promise<boolean> {
  const existing = await getRoleForOwner(ownerId, id)
  if (!existing) return false
  await prisma.role.delete({ where: { id } })
  return true
}
```

- [ ] **Step 2: `apps/web/app/(app)/roles/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { ok, fail, type ActionResult } from '@/lib/action-result'
import { createRole, updateRole, deleteRole, type RoleCreateInput } from '@ao/db'
import { RoleInput } from '@ao/shared'

async function uid(): Promise<string | null> {
  const s = await auth()
  return s?.user?.id ?? null
}

const effortMap = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', max: 'MAX' } as const

export async function createRoleAction(callerId: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = RoleInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  const data: RoleCreateInput = {
    name: parsed.data.name,
    description: parsed.data.description,
    systemPrompt: parsed.data.systemPrompt,
    defaultProviderId: parsed.data.defaultProviderId ?? null,
    defaultModel: parsed.data.defaultModel ?? null,
    defaultEffort: effortMap[parsed.data.defaultEffort],
    toolPermissions: parsed.data.toolPermissions,
    skillIds: parsed.data.skillIds,
  }
  try {
    const role = await createRole(id, data)
    revalidatePath('/roles')
    return ok({ id: role.id })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return fail('A role with this name already exists')
    throw e
  }
}

export async function updateRoleAction(callerId: string | null, roleId: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const parsed = RoleInput.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'invalid input')
  const data: RoleCreateInput = {
    name: parsed.data.name,
    description: parsed.data.description,
    systemPrompt: parsed.data.systemPrompt,
    defaultProviderId: parsed.data.defaultProviderId ?? null,
    defaultModel: parsed.data.defaultModel ?? null,
    defaultEffort: effortMap[parsed.data.defaultEffort],
    toolPermissions: parsed.data.toolPermissions,
    skillIds: parsed.data.skillIds,
  }
  const upd = await updateRole(id, roleId, data)
  if (!upd) return fail('not found')
  revalidatePath('/roles')
  revalidatePath(`/roles/${roleId}/edit`)
  return ok({ id: upd.id })
}

export async function deleteRoleAction(callerId: string | null, roleId: string): Promise<ActionResult<{ id: string }>> {
  const id = callerId ?? (await uid())
  if (!id) return fail('not authenticated')
  const ok2 = await deleteRole(id, roleId)
  if (!ok2) return fail('not found')
  revalidatePath('/roles')
  return ok({ id: roleId })
}
```

- [ ] **Step 3: `apps/web/components/skill-picker.tsx`**

```tsx
'use client'
import { useState } from 'react'

export function SkillPicker({
  available,
  selectedIds: initial,
  name,
}: {
  available: { id: string; name: string }[]
  selectedIds: string[]
  name: string
}) {
  const [picked, setPicked] = useState(new Set(initial))
  const toggle = (id: string) => {
    const next = new Set(picked)
    next.has(id) ? next.delete(id) : next.add(id)
    setPicked(next)
  }
  return (
    <div>
      <span className="block text-sm opacity-70">Skills</span>
      <div className="mt-2 space-y-1 rounded border border-white/10 p-3 max-h-72 overflow-auto">
        {available.length === 0 ? (
          <p className="text-xs opacity-50">No skills yet — create one first.</p>
        ) : (
          available.map((s) => (
            <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/5">
              <input
                type="checkbox"
                checked={picked.has(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span className="text-sm">{s.name}</span>
            </label>
          ))
        )}
      </div>
      {[...picked].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Replace `apps/web/app/(app)/roles/page.tsx`**

```tsx
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listRolesForOwner } from '@ao/db'
import { DataTable, type Column } from '@/components/data-table'

type RoleRow = Awaited<ReturnType<typeof listRolesForOwner>>[number]

export default async function RolesPage() {
  const session = await auth()
  const roles = session?.user?.id ? await listRolesForOwner(session.user.id) : []

  const columns: Column<RoleRow>[] = [
    { header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
    { header: 'Effort', cell: (r) => <span className="opacity-70">{r.defaultEffort.toLowerCase()}</span> },
    {
      header: 'Skills',
      cell: (r) => <span className="opacity-60 text-xs">{r.skills.length}</span>,
    },
  ]

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <Link href="/roles/new" className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500">
          + New role
        </Link>
      </div>
      <DataTable rows={roles} columns={columns} rowHref={(r) => `/roles/${r.id}/edit`} emptyMessage="No roles yet." />
    </main>
  )
}
```

- [ ] **Step 5: `apps/web/app/(app)/roles/new/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listSkillsForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { SkillPicker } from '@/components/skill-picker'
import { createRoleAction } from '../actions'

export default async function NewRolePage() {
  const session = await auth()
  const skills = session?.user?.id ? await listSkillsForOwner(session.user.id) : []

  async function submit(formData: FormData) {
    'use server'
    const res = await createRoleAction(null, {
      name: formData.get('name'),
      description: formData.get('description'),
      systemPrompt: formData.get('systemPrompt'),
      defaultEffort: formData.get('defaultEffort') ?? 'high',
      toolPermissions: {
        read: formData.get('read') === 'on',
        edit: formData.get('edit') === 'on',
        bash: formData.get('bash') === 'on',
        webFetch: formData.get('webFetch') === 'on',
      },
      skillIds: formData.getAll('skillIds').map(String),
    })
    if (res.ok) redirect('/roles')
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New role</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="Backend Dev" />
        <FormField label="Description" name="description" required />
        <TextArea label="System prompt" name="systemPrompt" required rows={10} />
        <label className="block">
          <span className="block text-sm opacity-70">Default effort</span>
          <select name="defaultEffort" defaultValue="high" className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2">
            {['low', 'medium', 'high', 'max'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <fieldset className="rounded border border-white/10 p-3">
          <legend className="px-2 text-sm opacity-70">Tool permissions</legend>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['read', 'edit', 'bash', 'webFetch'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" name={k} defaultChecked />
                {k}
              </label>
            ))}
          </div>
        </fieldset>
        <SkillPicker available={skills.map((s) => ({ id: s.id, name: s.name }))} selectedIds={[]} name="skillIds" />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Create</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 6: `apps/web/app/(app)/roles/[id]/edit/page.tsx`**

```tsx
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRoleForOwner, listSkillsForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { SkillPicker } from '@/components/skill-picker'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { updateRoleAction, deleteRoleAction } from '../../actions'

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const role = await getRoleForOwner(session.user.id, id)
  if (!role) notFound()
  const skills = await listSkillsForOwner(session.user.id)

  async function save(formData: FormData) {
    'use server'
    const res = await updateRoleAction(null, id, {
      name: formData.get('name'),
      description: formData.get('description'),
      systemPrompt: formData.get('systemPrompt'),
      defaultEffort: formData.get('defaultEffort') ?? 'high',
      toolPermissions: {
        read: formData.get('read') === 'on',
        edit: formData.get('edit') === 'on',
        bash: formData.get('bash') === 'on',
        webFetch: formData.get('webFetch') === 'on',
      },
      skillIds: formData.getAll('skillIds').map(String),
    })
    if (res.ok) redirect('/roles')
  }
  async function remove() { 'use server'; await deleteRoleAction(null, id); redirect('/roles') }

  const tp = role.toolPermissions as { read: boolean; edit: boolean; bash: boolean; webFetch: boolean }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Edit role</h1>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={role.name} />
        <FormField label="Description" name="description" required defaultValue={role.description} />
        <TextArea label="System prompt" name="systemPrompt" required rows={10} defaultValue={role.systemPrompt} />
        <label className="block">
          <span className="block text-sm opacity-70">Default effort</span>
          <select name="defaultEffort" defaultValue={role.defaultEffort.toLowerCase()} className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2">
            {['low', 'medium', 'high', 'max'].map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <fieldset className="rounded border border-white/10 p-3">
          <legend className="px-2 text-sm opacity-70">Tool permissions</legend>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['read', 'edit', 'bash', 'webFetch'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" name={k} defaultChecked={tp[k]} />
                {k}
              </label>
            ))}
          </div>
        </fieldset>
        <SkillPicker
          available={skills.map((s) => ({ id: s.id, name: s.name }))}
          selectedIds={role.skills.map((rs) => rs.skillId)}
          name="skillIds"
        />
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Save</button>
          <ConfirmDeleteButton action={remove} />
        </div>
      </form>
    </main>
  )
}
```

- [ ] **Step 7: Write `apps/web/tests/integration/roles.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@ao/db'
import { createRoleAction, updateRoleAction, deleteRoleAction } from '@/app/(app)/roles/actions'
import { listRolesForOwner } from '@ao/db'

async function makeOwner() {
  return prisma.user.create({ data: { email: `r+${Date.now()}@t.com`, role: 'OWNER' } })
}

describe('roles CRUD', () => {
  beforeEach(async () => {
    await prisma.roleSkill.deleteMany()
    await prisma.role.deleteMany()
    await prisma.skill.deleteMany()
    await prisma.user.deleteMany()
    vi.stubEnv('AUTH_MODE', 'local')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates a role with attached skills', async () => {
    const u = await makeOwner()
    const skill = await prisma.skill.create({
      data: { ownerId: u.id, name: 'tdd', description: '', content: '', frontmatter: {}, compatibleProviders: [] },
    })
    const res = await createRoleAction(u.id, {
      name: 'Backend',
      description: 'be',
      systemPrompt: 'you are backend',
      defaultEffort: 'high',
      toolPermissions: { read: true, edit: true, bash: false, webFetch: true },
      skillIds: [skill.id],
    })
    expect(res.ok).toBe(true)
    const list = await listRolesForOwner(u.id)
    expect(list).toHaveLength(1)
    expect(list[0]!.skills).toHaveLength(1)
  })

  it('updates skill set on role', async () => {
    const u = await makeOwner()
    const s1 = await prisma.skill.create({ data: { ownerId: u.id, name: 'a', description: '', content: '', frontmatter: {}, compatibleProviders: [] } })
    const s2 = await prisma.skill.create({ data: { ownerId: u.id, name: 'b', description: '', content: '', frontmatter: {}, compatibleProviders: [] } })
    const created = await createRoleAction(u.id, { name: 'r', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [s1.id] })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const upd = await updateRoleAction(u.id, created.data.id, { name: 'r', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [s2.id] })
    expect(upd.ok).toBe(true)
    const after = await listRolesForOwner(u.id)
    expect(after[0]!.skills.map((rs) => rs.skillId)).toEqual([s2.id])
  })

  it('deletes a role', async () => {
    const u = await makeOwner()
    const created = await createRoleAction(u.id, { name: 'x', description: '', systemPrompt: 'p', defaultEffort: 'high', toolPermissions: { read: true, edit: true, bash: true, webFetch: true }, skillIds: [] })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const del = await deleteRoleAction(u.id, created.data.id)
    expect(del.ok).toBe(true)
    expect(await listRolesForOwner(u.id)).toHaveLength(0)
  })
})
```

- [ ] **Step 8: Run tests + typecheck + commit**

```bash
COREPACK_ENABLE_STRICT=0 pnpm test:integration apps/web/tests/integration/roles.test.ts
COREPACK_ENABLE_STRICT=0 pnpm -r typecheck
git add .
git commit -m "feat(web): Roles CRUD with skill attachment + integration tests"
```

---

## Tasks 6–10: Apply the same CRUD pattern to remaining entities

The remaining 5 entities (Personas, MCP Servers, Plugins, Projects, Components) follow the exact pattern of Tasks 4–5. To keep this plan readable, each task below lists only the per-entity specifics that differ from the canonical Skills/Roles example. **Implementers MUST NOT skip files** — every task creates the same 5 files (repository + actions + list + new + edit), an integration test, and a commit.

### Task 6: Personas CRUD

Same as Roles, but Personas have `roleIds` (not `skillIds`) and an `identityPrompt` text field instead of `systemPrompt`. The picker is `RolePicker` (same shape as `SkillPicker` but list source is `listRolesForOwner`). The actions file imports `PersonaInput` from `@ao/shared`. Junction table is `PersonaRole`. Repository at `packages/db/src/repos/persona.ts`. Actions at `apps/web/app/(app)/personas/actions.ts`. Pages at `apps/web/app/(app)/personas/{page,new/page,[id]/edit/page}.tsx`. Integration test asserts: create with role attachment, update role list, delete. Commit message: `feat(web): Personas CRUD with role attachment + integration tests`.

### Task 7: MCP Servers CRUD

Two new wrinkles compared to Skills:

**Encrypted env handling.** The form accepts `env` as a key/value list. The action encrypts each value with `encrypt(value, deriveKey(SECRET_KEY))` (imported from `@ao/shared/crypto`) before storing. Read paths return `envEncrypted` as-is — only the secret-reveal endpoint decrypts.

**Secret-field UI.** Create `apps/web/components/secret-field.tsx`:

```tsx
'use client'
import { useState } from 'react'

export function SecretField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  const [reveal, setReveal] = useState(false)
  return (
    <label className="block">
      <span className="block text-sm opacity-70">{label}</span>
      <div className="mt-1 flex">
        <input
          name={name}
          type={reveal ? 'text' : 'password'}
          defaultValue={defaultValue}
          className="flex-1 rounded-l border border-white/10 bg-white/5 px-3 py-2"
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="rounded-r border border-l-0 border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"
        >
          {reveal ? 'hide' : 'reveal'}
        </button>
      </div>
    </label>
  )
}
```

**Repository:** `packages/db/src/repos/mcp-server.ts` exposes `createMcpServer`, `updateMcpServer`, `deleteMcpServer`, `listMcpServersForOwner`, `getMcpServerForOwner`. Encrypted env stored as `Json` of `Record<string, EncryptedRecord>`.

**Actions:** `apps/web/app/(app)/mcp/actions.ts` validates with `McpServerInput` from `@ao/shared`, encrypts env values, calls repo. Reveal action requires audit log entry: insert `AuditLog { action: 'mcp_secret_reveal', userId, targetType: 'McpServer', targetId }`.

**Pages:** as Skills — list, new, edit. Edit page uses `SecretField` with values masked by default (initial defaultValue = `''` — never round-trip ciphertext through HTML; if user wants to change, they re-enter).

**Integration test:** `apps/web/tests/integration/mcp.test.ts` — create with env, update env adds/removes keys, delete. Asserts encrypted env in DB is not equal to plaintext.

Commit: `feat(web): MCP Servers CRUD with AES-256-GCM encrypted env + audit log`.

### Task 8: Plugins CRUD (Claude only)

Repository at `packages/db/src/repos/plugin.ts`. Plugins are constrained to provider `claude` in Phase 2 — the actions look up the `claude` provider by `slug` and stamp `providerId` on create. `installStatus` is `'pending'` on create; an "Install" button on the edit page POSTs an `installPluginAction` that mocks the `claude plugin install <name>` shell command (don't actually shell out — just flip `installStatus` to `installed` after a 1-second delay; real shell execution lands in Phase 3 or Phase 4).

Pages: list (shows installStatus badge), new (just name + version + source), edit (shows install button if pending). Integration test exercises create → install (mock) → delete. Commit: `feat(web): Plugins CRUD with mock install pipeline`.

### Task 9: Projects CRUD (with members deferred)

Repository at `packages/db/src/repos/project.ts`. Project list/new/edit are simple (name + description, no relations on the form). Project detail page at `apps/web/app/(app)/projects/[id]/page.tsx` shows tabs:
- **Components** (Task 10's content)
- **Tickets** (placeholder text "Phase 3")
- **Members** (placeholder text "Team mode only")
- **Settings** (link to edit page)

Project edit page at `apps/web/app/(app)/projects/[id]/edit/page.tsx` allows rename/description edit and `archived` toggle.

Integration test creates two projects, lists, updates one, deletes one. Commit: `feat(web): Projects CRUD with archive toggle`.

### Task 10: Components CRUD (within project)

Components are nested under projects: routes at `apps/web/app/(app)/projects/[id]/components/{new/page,[componentId]/edit/page}.tsx`. The components list lives on the project detail page (Task 9 already shows it as a tab — populate it now). Repository at `packages/db/src/repos/component.ts` enforces `projectId` is owned by the caller. Form fields: name, path (text input — server-side validates path is absolute and exists with `existsSync`), description, env (KV list with `SecretField`).

Path validation server action returns `fail('path does not exist on disk')` for non-existent paths — better feedback than failing silently in Phase 3.

Integration test: project with 2 components, update component path, delete. Commit: `feat(web): Components CRUD nested under project`.

---

## Task 11: Settings → Providers tab

Mostly read-only — providers were seeded in Task 2.

**Files:**
- Replace: `apps/web/app/(app)/settings/page.tsx`
- Create: `apps/web/app/(app)/settings/providers/page.tsx`

- [ ] **Step 1: Replace `apps/web/app/(app)/settings/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
export default function SettingsPage() {
  redirect('/settings/providers')
}
```

- [ ] **Step 2: Create `apps/web/app/(app)/settings/providers/page.tsx`**

```tsx
import { prisma } from '@ao/db'

export default async function ProvidersSettings() {
  const providers = await prisma.provider.findMany({ orderBy: { slug: 'asc' } })
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Providers</h1>
      <p className="mt-2 text-sm opacity-70">
        Subscription-backed CLI providers. Models and effort levels are stored as catalog metadata.
      </p>
      <div className="mt-6 space-y-4">
        {providers.map((p) => {
          const models = (p.models as { id: string; name: string; effortLevels: string[] }[]) ?? []
          return (
            <section key={p.id} className="rounded border border-white/10 p-4">
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{p.name}</h2>
                <span className="text-xs opacity-50">{p.cliCommand}</span>
              </header>
              <div className="mt-2 flex gap-3 text-xs">
                {p.supportsSkills && <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">skills</span>}
                {p.supportsPlugins && <span className="rounded bg-violet-500/15 px-2 py-0.5 text-violet-300">plugins</span>}
                {p.supportsMcp && <span className="rounded bg-sky-500/15 px-2 py-0.5 text-sky-300">mcp</span>}
              </div>
              <table className="mt-3 w-full text-sm">
                <thead><tr className="text-left opacity-60"><th className="py-1">Model</th><th className="py-1">Effort levels</th></tr></thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id} className="border-t border-white/5">
                      <td className="py-1">{m.name}</td>
                      <td className="py-1 opacity-70">{m.effortLevels.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Run typecheck + commit**

```bash
COREPACK_ENABLE_STRICT=0 pnpm -r typecheck
git add .
git commit -m "feat(web): Settings → Providers tab listing seeded provider catalog"
```

---

## Task 12: Phase 2 done criteria + smoke

- [ ] **Step 1: Run all tests + typecheck**

```bash
COREPACK_ENABLE_STRICT=0 pnpm test
COREPACK_ENABLE_STRICT=0 pnpm test:integration
COREPACK_ENABLE_STRICT=0 pnpm -r typecheck
```
Expected: 14+ unit pass, 9+ integration pass (added: skills, roles, personas, mcp, plugins, projects, components), typecheck clean.

- [ ] **Step 2: Manual smoke**

```bash
COREPACK_ENABLE_STRICT=0 pnpm dev
```
Sign in. Create:
- 1 Skill ("tdd") with provider `claude`
- 1 Role ("backend") with the skill attached
- 1 Persona ("alex") with the role
- 1 MCP server ("postgres") with an env value, save, edit, verify env value masked
- 1 Plugin ("superpowers") in pending state, click install, status flips to installed
- 1 Project ("Demo") with 1 component pointing at `/tmp` (which exists)
- Visit Settings → Providers, see 3 seeded providers with their models

Stop dev server.

- [ ] **Step 3: Update README phase status**

Mark Phase 2 done in `README.md`'s phase status block.

- [ ] **Step 4: Final commit**

```bash
git add README.md
git commit -m "chore: Phase 2 done — Catalog CRUD complete"
```

---

## Done criteria for Phase 2

All true at end of phase:
- [ ] All Phase 1 carry-over fixes landed (tsconfig-paths, conventions doc, AUTH_MODE=none bootstrap, orchestrator-client stub, bcrypt cost 12).
- [ ] Schema migration `phase2_catalog` applies cleanly; 13 new tables exist; 3 providers seeded.
- [ ] CRUD works end-to-end for Skills, Roles, Personas, MCP Servers, Plugins, Projects, Components.
- [ ] MCP env values are AES-256-GCM encrypted at rest (verified by `psql` query showing ciphertext).
- [ ] All integration tests for Phase 2 entities pass.
- [ ] `pnpm dev` still boots both services; sidebar links work.
- [ ] Settings → Providers shows the seeded catalog.
- [ ] No type errors across all 4 packages.

---

## Self-Review Notes

**Spec coverage:**
- Personas, Roles, Skills, Plugins, MCP Servers, Projects, Components — all in spec section 5.3–5.6, all covered by Tasks 4–10.
- Provider catalog (5.2) — Task 2 seeds + Task 11 displays.
- AuditLog usage for MCP secret reveal (8.5) — Task 7.
- Encrypted env (8.4) — Task 7 via `@ao/shared/crypto`.
- Out of Phase 2 scope: Tickets, Agents, Messages, RunEvents, dispatch, slash, file refs, MCP gateway, multi-agent, token tracking — all Phase 3+ deliberately.

**Type/name consistency:**
- Action signatures uniformly `(callerId: string | null, raw: unknown) → Promise<ActionResult<{ id: string }>>` for create/update; `(callerId, id) → ...` for delete.
- Repository signatures uniformly `*ForOwner(ownerId, id)` for read, `*(ownerId, ...)` for write.
- Effort enum: lowercase in zod input (`'low'|'medium'|'high'|'max'`) → uppercase Prisma enum via `effortMap`.
- File paths consistent: `apps/web/app/(app)/<entity>/{page,new/page,[id]/edit/page}.tsx` across entities.

**Forward-looking concerns left for Phase 3:**
- Provider/model selector UIs in Role and Persona forms — present as raw text inputs in Phase 2 (defer typed dropdown until Task 11's data is consumed by the dispatch flow).
- Project membership UI — schema exists, UI deferred to team-mode work.
- MCP "test connection" button — defer until MCP Gateway lands in Phase 5.
