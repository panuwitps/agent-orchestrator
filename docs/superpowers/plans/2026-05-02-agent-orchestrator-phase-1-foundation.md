# Agent Orchestrator — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootable monorepo where `pnpm dev` starts Next.js + Orchestrator side-by-side, the first user can sign up, log in, see an empty dashboard, and log out. Foundation for all subsequent phases.

**Architecture:** pnpm workspaces monorepo. Two long-running processes (Next.js port 3000, Hono Orchestrator port 4000) sharing a Postgres database via Prisma. Auth.js v5 with credentials provider gated by `AUTH_MODE` env (`none`/`local`/`team`).

**Tech Stack:** pnpm, TypeScript, Next.js 15 (App Router) + Tailwind + shadcn/ui, Hono, Prisma, Postgres, Auth.js v5, Vitest, Zod, bcrypt, AES-256-GCM via `node:crypto`.

**Companion spec:** `docs/superpowers/specs/2026-05-02-agent-orchestrator-design.md`.

**Prerequisite:** Postgres 16 must be installed locally. On macOS: install [Postgres.app](https://postgresapp.com) and ensure `psql` is on PATH.

---

## File Structure (created by this phase)

```
agent-orchestrator/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── layout.tsx                  # root layout (theme + providers)
│   │   │   ├── page.tsx                    # /
│   │   │   ├── login/page.tsx              # /login
│   │   │   ├── signup/page.tsx             # /signup
│   │   │   ├── projects/page.tsx           # placeholder
│   │   │   ├── tickets/page.tsx            # placeholder
│   │   │   ├── personas/page.tsx           # placeholder
│   │   │   ├── roles/page.tsx              # placeholder
│   │   │   ├── skills/page.tsx             # placeholder
│   │   │   ├── plugins/page.tsx            # placeholder
│   │   │   ├── mcp/page.tsx                # placeholder
│   │   │   ├── settings/page.tsx           # placeholder
│   │   │   ├── healthz/route.ts            # health endpoint
│   │   │   └── api/
│   │   │       └── auth/[...nextauth]/route.ts
│   │   ├── components/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── command-palette.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── lib/
│   │   │   ├── auth.ts                     # Auth.js config
│   │   │   ├── auth-mode.ts                # AUTH_MODE helper
│   │   │   └── prisma.ts                   # singleton client
│   │   ├── middleware.ts                   # session gate
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── orchestrator/
│       ├── src/
│       │   ├── index.ts                    # Hono entry, port 4000
│       │   ├── routes/healthz.ts
│       │   └── middleware/internal-auth.ts
│       ├── tests/
│       │   └── healthz.test.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/                 # generated
│   │   ├── src/
│   │   │   └── index.ts                    # exports PrismaClient + types
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── shared/
│       ├── src/
│       │   ├── crypto.ts                   # AES-256-GCM helpers
│       │   ├── validators.ts               # Zod schemas
│       │   └── index.ts
│       ├── tests/
│       │   └── crypto.test.ts
│       ├── tsconfig.json
│       └── package.json
├── scripts/
│   └── dev.ts                              # concurrently runner
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml
├── package.json                            # root
├── tsconfig.base.json
├── vitest.config.ts                        # root
└── README.md
```

**File responsibilities:**
- `packages/db` owns Prisma schema and exports the single source of truth client.
- `packages/shared` owns cross-process utilities (no Next or Hono dependencies).
- `apps/web` owns UI + auth + thin CRUD; `apps/orchestrator` owns long-running concerns.
- `scripts/dev.ts` is the only place that knows how to start both apps together.

---

## Task 1: Initialize pnpm monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Verify prerequisites**

Run:
```bash
node --version          # Expect v20.x or v22.x
pnpm --version          # Expect 9.x; if missing: npm i -g pnpm@9
psql --version          # Expect 14+; if missing: install Postgres.app
```

If `psql` is not on PATH after installing Postgres.app, follow Postgres.app's "Configure $PATH" instructions.

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "agent-orchestrator",
  "private": true,
  "version": "0.1.0",
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "scripts": {
    "dev": "tsx scripts/dev.ts",
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "concurrently": "^9.0.0",
    "prettier": "^3.3.0",
    "tsx": "^4.16.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.next/
.turbo/
*.log
.env
.env.local
.DS_Store
coverage/
.vitest-cache/
prisma/dev.db
attachments/
```

- [ ] **Step 6: Create `.env.example`**

```
# Auth
AUTH_MODE=local                                  # none | local | team
AUTH_SECRET=                                     # openssl rand -base64 32
AUTH_INVITE_ONLY=true
AUTH_OAUTH_PROVIDERS=

# DB
DATABASE_URL=postgresql://localhost:5432/agent_orchestrator

# Crypto
SECRET_KEY=                                      # openssl rand -base64 32

# Internal service token
INTERNAL_API_TOKEN=                              # openssl rand -base64 32

# Orchestrator
ORCHESTRATOR_PORT=4000
ORCHESTRATOR_URL=http://localhost:4000
```

- [ ] **Step 7: Create minimal `README.md`**

```markdown
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
```

- [ ] **Step 8: Install root deps**

Run:
```bash
pnpm install
```
Expected: lockfile created, no errors.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: init pnpm monorepo with shared tsconfig"
```

---

## Task 2: Postgres database setup

**Files:**
- Modify: `.env` (local only, not committed)

- [ ] **Step 1: Generate secrets and write `.env`**

Run:
```bash
cp .env.example .env
{
  echo "AUTH_SECRET=$(openssl rand -base64 32)"
  echo "SECRET_KEY=$(openssl rand -base64 32)"
  echo "INTERNAL_API_TOKEN=$(openssl rand -base64 32)"
} >> .env
```

Expected: `.env` exists with three filled secrets. Then manually edit so the variable lines are not duplicated (delete the original empty `AUTH_SECRET=`/`SECRET_KEY=`/`INTERNAL_API_TOKEN=` lines from the example).

- [ ] **Step 2: Create database**

Run:
```bash
createdb agent_orchestrator
psql -d agent_orchestrator -c '\conninfo'
```
Expected: `You are connected to database "agent_orchestrator"...`

- [ ] **Step 3: Verify connection from `.env`**

Run:
```bash
psql "$(grep DATABASE_URL .env | cut -d= -f2-)" -c '\q'
```
Expected: exits with code 0, no error.

- [ ] **Step 4: No commit** (`.env` is gitignored)

---

## Task 3: `packages/db` — Prisma schema and client

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/tests/connection.test.ts`

- [ ] **Step 1: Create `packages/db/package.json`**

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
    "lint": "echo 'no lint configured'"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Create `packages/db/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ----- Auth.js -----

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

  accounts Account[]
  sessions Session[]

  @@map("users")
}

enum UserRole {
  OWNER
  ADMIN
  MEMBER
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ----- Audit -----

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String
  targetType String?
  targetId   String?
  ip         String?
  userAgent  String?
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@map("audit_logs")
}
```

- [ ] **Step 4: Create `packages/db/src/index.ts`**

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
```

- [ ] **Step 5: Install package deps**

Run:
```bash
pnpm install
```

- [ ] **Step 6: Generate initial migration**

Run:
```bash
pnpm --filter @ao/db prisma migrate dev --name init
```
Expected: migration created at `packages/db/prisma/migrations/<timestamp>_init/`, tables exist in DB.

Verify:
```bash
psql -d agent_orchestrator -c '\dt'
```
Expected: `users`, `accounts`, `sessions`, `verification_tokens`, `audit_logs`, `_prisma_migrations`.

- [ ] **Step 7: Write failing connection test `packages/db/tests/connection.test.ts`**

```ts
import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../src'

describe('db connection', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('connects and lists zero users', async () => {
    const count = await prisma.user.count()
    expect(count).toBe(0)
  })
})
```

- [ ] **Step 8: Run test (expect fail until vitest is configured at root)**

Run:
```bash
pnpm test packages/db
```
Expected: `vitest` resolves no config yet — failure is OK; we'll wire in Task 14.

- [ ] **Step 9: Commit**

```bash
git add packages/db .env.example
git commit -m "feat(db): add Prisma schema with User/Auth/AuditLog and singleton client"
```

---

## Task 4: `packages/shared` — Crypto + Zod validators

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/crypto.ts`
- Create: `packages/shared/src/validators.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/crypto.test.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@ao/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "echo 'no lint configured'"
  },
  "dependencies": {
    "zod": "^3.23.8"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Write failing crypto tests `packages/shared/tests/crypto.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, deriveKey } from '../src/crypto'

const KEY_B64 = Buffer.alloc(32, 7).toString('base64')

describe('crypto AES-256-GCM', () => {
  it('roundtrips a plaintext', () => {
    const key = deriveKey(KEY_B64)
    const enc = encrypt('hello world', key)
    expect(enc.ciphertext).not.toContain('hello')
    expect(decrypt(enc, key)).toBe('hello world')
  })

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const key = deriveKey(KEY_B64)
    const a = encrypt('same', key)
    const b = encrypt('same', key)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })

  it('fails to decrypt if tag is tampered', () => {
    const key = deriveKey(KEY_B64)
    const enc = encrypt('payload', key)
    const tampered = { ...enc, tag: Buffer.alloc(16, 0).toString('base64') }
    expect(() => decrypt(tampered, key)).toThrow()
  })

  it('rejects an invalid key length', () => {
    expect(() => deriveKey(Buffer.alloc(16).toString('base64'))).toThrow(/32 bytes/)
  })
})
```

- [ ] **Step 4: Run tests (expect fail — module missing)**

Run:
```bash
pnpm vitest run packages/shared
```
Expected: cannot resolve `'../src/crypto'`.

- [ ] **Step 5: Implement `packages/shared/src/crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export interface EncryptedRecord {
  ciphertext: string  // base64
  iv: string          // base64 (12 bytes)
  tag: string         // base64 (16 bytes)
  keyVersion: number
}

export function deriveKey(secretBase64: string): Buffer {
  const key = Buffer.from(secretBase64, 'base64')
  if (key.length !== 32) {
    throw new Error('SECRET_KEY must decode to 32 bytes (use openssl rand -base64 32)')
  }
  return key
}

export function encrypt(plaintext: string, key: Buffer, keyVersion = 1): EncryptedRecord {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyVersion,
  }
}

export function decrypt(record: EncryptedRecord, key: Buffer): string {
  const iv = Buffer.from(record.iv, 'base64')
  const tag = Buffer.from(record.tag, 'base64')
  const ciphertext = Buffer.from(record.ciphertext, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
```

- [ ] **Step 6: Implement `packages/shared/src/validators.ts`**

```ts
import { z } from 'zod'

export const Email = z.string().email().max(255)
export const Password = z.string().min(8).max(200)
export const NonEmptyString = z.string().trim().min(1).max(255)

export const SignupInput = z.object({
  email: Email,
  password: Password,
  name: NonEmptyString.optional(),
})
export type SignupInput = z.infer<typeof SignupInput>

export const LoginInput = z.object({
  email: Email,
  password: Password,
})
export type LoginInput = z.infer<typeof LoginInput>
```

- [ ] **Step 7: Implement `packages/shared/src/index.ts`**

```ts
export * from './crypto'
export * from './validators'
```

- [ ] **Step 8: Run crypto tests (expect pass)**

Run:
```bash
pnpm vitest run packages/shared
```
Expected: 4/4 pass.

- [ ] **Step 9: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add AES-256-GCM crypto and zod validators"
```

---

## Task 5: Vitest configuration at root

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.integration.config.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts', 'apps/*/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/integration/**'],
    environment: 'node',
    globals: false,
  },
})
```

- [ ] **Step 2: Create `vitest.integration.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/integration/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    testTimeout: 30_000,
  },
})
```

- [ ] **Step 3: Run all unit tests**

Run:
```bash
pnpm test
```
Expected: shared crypto tests pass; db connection test runs (passes if DB has zero users — should be true after fresh migrate).

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts vitest.integration.config.ts
git commit -m "chore: configure root vitest for unit + integration"
```

---

## Task 6: `apps/web` — Next.js 15 scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/healthz/route.ts`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@ao/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ao/db": "workspace:*",
    "@ao/shared": "workspace:*",
    "@auth/prisma-adapter": "^2.7.2",
    "bcryptjs": "^2.4.3",
    "next": "^15.0.0",
    "next-auth": "5.0.0-beta.22",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/next.config.ts`**

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
}

export default config
```

- [ ] **Step 4: Create `apps/web/postcss.config.js`**

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 5: Create `apps/web/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Create `apps/web/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }
html { background: #0b0b0d; color: #e6e6e7; }
```

- [ ] **Step 7: Create `apps/web/app/layout.tsx`**

```tsx
import './globals.css'

export const metadata = { title: 'Agent Orchestrator' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b0b0d] text-[#e6e6e7] antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Create temporary `apps/web/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Agent Orchestrator</h1>
      <p className="mt-2 text-sm opacity-70">Foundation booted.</p>
    </main>
  )
}
```

- [ ] **Step 9: Create `apps/web/app/healthz/route.ts`**

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true, service: 'web' })
}
```

- [ ] **Step 10: Install deps and run dev**

Run:
```bash
pnpm install
pnpm --filter @ao/web dev
```
In another terminal:
```bash
curl -s localhost:3000/healthz
```
Expected: `{"ok":true,"service":"web"}`. Stop dev server.

- [ ] **Step 11: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js 15 app with Tailwind + healthz"
```

---

## Task 7: Auth.js v5 — credentials provider, AUTH_MODE-aware

**Files:**
- Create: `apps/web/lib/auth-mode.ts`
- Create: `apps/web/lib/prisma.ts`
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/types/next-auth.d.ts`
- Create: `apps/web/tests/auth-mode.test.ts`

- [ ] **Step 1: Write failing test `apps/web/tests/auth-mode.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveAuthMode, isSignupAllowed } from '../lib/auth-mode'

describe('auth-mode', () => {
  beforeEach(() => {
    delete process.env.AUTH_MODE
  })

  it('defaults to local when env unset', () => {
    expect(resolveAuthMode()).toBe('local')
  })

  it('respects AUTH_MODE=team', () => {
    process.env.AUTH_MODE = 'team'
    expect(resolveAuthMode()).toBe('team')
  })

  it('throws on unknown mode', () => {
    process.env.AUTH_MODE = 'nope'
    expect(() => resolveAuthMode()).toThrow()
  })

  it('local: allows signup when no users exist', () => {
    expect(isSignupAllowed('local', 0)).toBe(true)
  })

  it('local: disallows signup once any user exists', () => {
    expect(isSignupAllowed('local', 1)).toBe(false)
  })

  it('none: never allows signup (auto-login implied)', () => {
    expect(isSignupAllowed('none', 0)).toBe(false)
  })

  it('team: signup is invite-only and not via /signup form', () => {
    expect(isSignupAllowed('team', 0)).toBe(false)
  })
})
```

Run:
```bash
pnpm vitest run apps/web/tests/auth-mode.test.ts
```
Expected: cannot resolve module.

- [ ] **Step 2: Implement `apps/web/lib/auth-mode.ts`**

```ts
export type AuthMode = 'none' | 'local' | 'team'

export function resolveAuthMode(): AuthMode {
  const raw = (process.env.AUTH_MODE ?? 'local').toLowerCase()
  if (raw === 'none' || raw === 'local' || raw === 'team') return raw
  throw new Error(`Invalid AUTH_MODE: ${raw}`)
}

export function isSignupAllowed(mode: AuthMode, existingUserCount: number): boolean {
  if (mode === 'local') return existingUserCount === 0
  return false
}
```

- [ ] **Step 3: Run tests (expect pass)**

Run:
```bash
pnpm vitest run apps/web/tests/auth-mode.test.ts
```
Expected: 7/7 pass.

- [ ] **Step 4: Implement `apps/web/lib/prisma.ts`**

```ts
export { prisma } from '@ao/db'
```

- [ ] **Step 5: Implement `apps/web/lib/auth.ts`**

```ts
import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { LoginInput } from '@ao/shared'
import { prisma } from './prisma'
import { resolveAuthMode } from './auth-mode'

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' } & DefaultSession['user']
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const mode = resolveAuthMode()
        if (mode === 'none') {
          // auto-login as default user (created on first boot by seed)
          const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
          return user
            ? { id: user.id, email: user.email, name: user.name, role: user.role }
            : null
        }
        const parsed = LoginInput.safeParse(raw)
        if (!parsed.success) return null
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
        if (!user?.hashedPassword) return null
        const ok = await bcrypt.compare(parsed.data.password, user.hashedPassword)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: { ...session.user, id: user.id, role: (user as any).role },
    }),
  },
})
```

- [ ] **Step 6: Implement `apps/web/app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 7: Run typecheck**

Run:
```bash
pnpm --filter @ao/web typecheck
```
Expected: passes.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): wire Auth.js v5 with Credentials + Prisma adapter and AUTH_MODE"
```

---

## Task 8: Signup page (first-user gate)

**Files:**
- Create: `apps/web/app/signup/page.tsx`
- Create: `apps/web/app/signup/actions.ts`
- Create: `apps/web/tests/integration/signup.test.ts`

- [ ] **Step 1: Write failing integration test `apps/web/tests/integration/signup.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@ao/db'
import { signupAction } from '../../app/signup/actions'

describe('signupAction', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
    process.env.AUTH_MODE = 'local'
  })

  it('creates the first user and marks them OWNER', async () => {
    const res = await signupAction({
      email: 'a@a.com',
      password: 'password123',
      name: 'Alice',
    })
    expect(res.ok).toBe(true)
    const user = await prisma.user.findUnique({ where: { email: 'a@a.com' } })
    expect(user?.role).toBe('OWNER')
    expect(user?.hashedPassword).toBeTruthy()
    expect(user?.hashedPassword).not.toBe('password123')
  })

  it('rejects signup once a user exists in local mode', async () => {
    await signupAction({ email: 'a@a.com', password: 'password123' })
    const res = await signupAction({ email: 'b@b.com', password: 'password123' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/disabled/i)
  })
})
```

Run:
```bash
pnpm test:integration apps/web/tests/integration/signup.test.ts
```
Expected: cannot resolve `../../app/signup/actions`.

- [ ] **Step 2: Implement `apps/web/app/signup/actions.ts`**

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
  const hashed = await bcrypt.hash(parsed.data.password, 10)
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

- [ ] **Step 3: Run integration test (expect pass)**

Run:
```bash
pnpm test:integration apps/web/tests/integration/signup.test.ts
```
Expected: 2/2 pass.

- [ ] **Step 4: Implement `apps/web/app/signup/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { resolveAuthMode, isSignupAllowed } from '@/lib/auth-mode'
import { prisma } from '@/lib/prisma'
import { signupAction } from './actions'

export default async function SignupPage() {
  const mode = resolveAuthMode()
  const count = await prisma.user.count()
  if (!isSignupAllowed(mode, count)) redirect('/login')

  async function submit(formData: FormData) {
    'use server'
    const res = await signupAction({
      email: formData.get('email'),
      password: formData.get('password'),
      name: formData.get('name') || undefined,
    })
    if (res.ok) redirect('/login?signedup=1')
  }

  return (
    <main className="mx-auto mt-24 max-w-sm space-y-6 p-6">
      <h1 className="text-xl font-semibold">Create the first owner account</h1>
      <form action={submit} className="space-y-3">
        <input
          name="name"
          placeholder="Name (optional)"
          className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8)"
          className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
        />
        <button className="w-full rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">
          Create account
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 5: Manual smoke test**

Run:
```bash
pnpm --filter @ao/web dev
```
Visit `http://localhost:3000/signup`. Submit a valid account. Expected: redirected to `/login?signedup=1`. Verify via `psql`:
```bash
psql -d agent_orchestrator -c "SELECT email, role FROM users;"
```
Expected: 1 row, role=OWNER.

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): /signup page with first-owner gate and server action"
```

---

## Task 9: Login page

**Files:**
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/app/login/login-form.tsx`

- [ ] **Step 1: Implement `apps/web/app/login/login-form.tsx`**

```tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export function LoginForm({ banner }: { banner?: string }) {
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        const fd = new FormData(e.currentTarget)
        const res = await signIn('credentials', {
          email: fd.get('email'),
          password: fd.get('password'),
          redirect: true,
          redirectTo: '/',
        })
        if (res?.error) setError('Invalid email or password')
      }}
      className="space-y-3"
    >
      {banner && <p className="rounded bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">{banner}</p>}
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Password"
        className="w-full rounded border border-white/10 bg-white/5 px-3 py-2"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="w-full rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">
        Sign in
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Implement `apps/web/app/login/page.tsx`**

```tsx
import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ signedup?: string }>
}) {
  const sp = await searchParams
  return (
    <main className="mx-auto mt-24 max-w-sm space-y-6 p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <LoginForm banner={sp.signedup === '1' ? 'Account created. Sign in.' : undefined} />
    </main>
  )
}
```

- [ ] **Step 3: Add `next-auth/react` dependency check**

Already pulled in by `next-auth`. No additional install.

- [ ] **Step 4: Manual smoke**

Run:
```bash
pnpm --filter @ao/web dev
```
Visit `/login`, sign in with the account from Task 8. Expected: redirected to `/`. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): /login page with credentials flow"
```

---

## Task 10: Middleware — protect everything except auth pages

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Implement `apps/web/middleware.ts`**

```ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PUBLIC = ['/login', '/signup', '/healthz']

export default auth((req) => {
  const { nextUrl } = req
  if (PUBLIC.some((p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }
  if (nextUrl.pathname.startsWith('/api/auth')) return NextResponse.next()
  if (!req.auth) {
    const url = new URL('/login', nextUrl.origin)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Manual smoke**

Run:
```bash
pnpm --filter @ao/web dev
```
Visit `/` while logged out. Expected: redirected to `/login`.
Sign in. Expected: redirected to `/`.
Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web): session-gated middleware"
```

---

## Task 11: Layout shell — sidebar, top bar, placeholder pages

**Files:**
- Create: `apps/web/components/sidebar.tsx`
- Create: `apps/web/components/topbar.tsx`
- Modify: `apps/web/app/layout.tsx` (only when logged-in pages render — split via auth-aware layout)
- Create: `apps/web/app/(app)/layout.tsx`
- Create: `apps/web/app/(app)/page.tsx`
- Create: `apps/web/app/(app)/projects/page.tsx`
- Create: `apps/web/app/(app)/tickets/page.tsx`
- Create: `apps/web/app/(app)/personas/page.tsx`
- Create: `apps/web/app/(app)/roles/page.tsx`
- Create: `apps/web/app/(app)/skills/page.tsx`
- Create: `apps/web/app/(app)/plugins/page.tsx`
- Create: `apps/web/app/(app)/mcp/page.tsx`
- Create: `apps/web/app/(app)/settings/page.tsx`
- Delete: `apps/web/app/page.tsx` (moved into `(app)/page.tsx`)

- [ ] **Step 1: Create `apps/web/components/sidebar.tsx`**

```tsx
import Link from 'next/link'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/tickets', label: 'Tickets' },
  { type: 'divider' as const },
  { href: '/personas', label: 'Personas' },
  { href: '/roles', label: 'Roles' },
  { href: '/skills', label: 'Skills' },
  { href: '/plugins', label: 'Plugins' },
  { href: '/mcp', label: 'MCP Servers' },
  { type: 'divider' as const },
  { href: '/settings', label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col gap-1 border-r border-white/10 bg-black/20 p-3">
      <div className="px-2 py-3 text-sm font-semibold tracking-wider">AGENT-ORCH</div>
      {NAV.map((item, i) =>
        item.type === 'divider' ? (
          <div key={i} className="my-2 h-px bg-white/10" />
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className="rounded px-2 py-1.5 text-sm hover:bg-white/5"
          >
            {item.label}
          </Link>
        ),
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Create `apps/web/components/topbar.tsx`**

```tsx
import { signOut } from '@/lib/auth'

export function Topbar({ email }: { email?: string | null }) {
  return (
    <header className="flex items-center justify-end gap-3 border-b border-white/10 px-4 py-2">
      <span className="text-sm opacity-70">{email}</span>
      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/login' })
        }}
      >
        <button className="rounded border border-white/10 px-2 py-1 text-xs hover:bg-white/5">
          Sign out
        </button>
      </form>
    </header>
  )
}
```

- [ ] **Step 3: Create `apps/web/app/(app)/layout.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar email={session?.user?.email} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/web/app/(app)/page.tsx`** (Home)

```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="mt-2 text-sm opacity-70">
        Quick Dispatch coming in Phase 3. For now, set up Personas, Roles, and Skills from the sidebar.
      </p>
    </main>
  )
}
```

- [ ] **Step 5: Create placeholder pages (one block to apply for each)**

For each of `projects`, `tickets`, `personas`, `roles`, `skills`, `plugins`, `mcp`, `settings`, create `apps/web/app/(app)/<name>/page.tsx`:

```tsx
export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold capitalize">__NAME__</h1>
      <p className="mt-2 text-sm opacity-70">Coming soon.</p>
    </main>
  )
}
```

Replace `__NAME__` with the page name when creating each file.

- [ ] **Step 6: Delete original `apps/web/app/page.tsx`**

Run:
```bash
rm apps/web/app/page.tsx
```

- [ ] **Step 7: Manual smoke**

Run:
```bash
pnpm --filter @ao/web dev
```
Sign in, click each sidebar link. Expected: each renders its placeholder. Sign Out works.
Stop dev server.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): app-shell layout with sidebar, topbar, placeholder pages"
```

---

## Task 12: Cmd+K command palette stub

**Files:**
- Create: `apps/web/components/command-palette.tsx`
- Modify: `apps/web/app/(app)/layout.tsx`
- Modify: `apps/web/package.json` (add cmdk)

- [ ] **Step 1: Add cmdk dependency**

Run:
```bash
pnpm --filter @ao/web add cmdk
```

- [ ] **Step 2: Create `apps/web/components/command-palette.tsx`**

```tsx
'use client'

import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ROUTES = [
  { label: 'Home', path: '/' },
  { label: 'Projects', path: '/projects' },
  { label: 'Tickets', path: '/tickets' },
  { label: 'Personas', path: '/personas' },
  { label: 'Roles', path: '/roles' },
  { label: 'Skills', path: '/skills' },
  { label: 'Plugins', path: '/plugins' },
  { label: 'MCP Servers', path: '/mcp' },
  { label: 'Settings', path: '/settings' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Palette"
      className="fixed inset-0 grid place-items-start pt-32"
    >
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative mx-auto w-[480px] rounded-lg border border-white/10 bg-[#1a1a1d] shadow-xl">
        <Command.Input
          placeholder="Type a command…"
          className="w-full bg-transparent px-4 py-3 outline-none"
        />
        <Command.List className="max-h-72 overflow-auto p-1">
          <Command.Empty className="px-3 py-2 text-sm opacity-50">No results.</Command.Empty>
          {ROUTES.map((r) => (
            <Command.Item
              key={r.path}
              onSelect={() => {
                setOpen(false)
                router.push(r.path)
              }}
              className="cursor-pointer rounded px-3 py-2 text-sm aria-selected:bg-white/10"
            >
              Go to {r.label}
            </Command.Item>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
```

- [ ] **Step 3: Mount in layout. Modify `apps/web/app/(app)/layout.tsx`**

Replace contents with:

```tsx
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { CommandPalette } from '@/components/command-palette'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar email={session?.user?.email} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
      <CommandPalette />
    </div>
  )
}
```

- [ ] **Step 4: Manual smoke**

Run:
```bash
pnpm --filter @ao/web dev
```
Press `Cmd+K`. Expected: palette opens. Pick a route. Expected: navigates. Press `Esc`. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): Cmd+K command palette with route navigation"
```

---

## Task 13: `apps/orchestrator` — Hono service skeleton

**Files:**
- Create: `apps/orchestrator/package.json`
- Create: `apps/orchestrator/tsconfig.json`
- Create: `apps/orchestrator/src/index.ts`
- Create: `apps/orchestrator/src/middleware/internal-auth.ts`
- Create: `apps/orchestrator/src/routes/healthz.ts`
- Create: `apps/orchestrator/tests/healthz.test.ts`

- [ ] **Step 1: Create `apps/orchestrator/package.json`**

```json
{
  "name": "@ao/orchestrator",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "echo 'no lint configured'"
  },
  "dependencies": {
    "@ao/db": "workspace:*",
    "@ao/shared": "workspace:*",
    "@hono/node-server": "^1.13.0",
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/orchestrator/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Implement `apps/orchestrator/src/middleware/internal-auth.ts`**

```ts
import type { MiddlewareHandler } from 'hono'

export const internalAuth: MiddlewareHandler = async (c, next) => {
  const expected = process.env.INTERNAL_API_TOKEN
  if (!expected) return c.json({ error: 'INTERNAL_API_TOKEN not configured' }, 500)
  const got = c.req.header('x-internal-token')
  if (got !== expected) return c.json({ error: 'unauthorized' }, 401)
  return next()
}
```

- [ ] **Step 4: Implement `apps/orchestrator/src/routes/healthz.ts`**

```ts
import { Hono } from 'hono'

export const healthz = new Hono()

healthz.get('/', (c) => c.json({ ok: true, service: 'orchestrator' }))
```

- [ ] **Step 5: Implement `apps/orchestrator/src/index.ts`**

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { healthz } from './routes/healthz'
import { internalAuth } from './middleware/internal-auth'

const app = new Hono()

app.route('/healthz', healthz)

// Internal-only namespace (will host /dispatch, /tickets/:id/* in later phases)
const internal = new Hono()
internal.use('*', internalAuth)
internal.get('/ping', (c) => c.json({ ok: true }))
app.route('/internal', internal)

const port = Number(process.env.ORCHESTRATOR_PORT ?? 4000)
serve({ fetch: app.fetch, port })
console.log(`[orchestrator] listening on :${port}`)
```

- [ ] **Step 6: Write failing test `apps/orchestrator/tests/healthz.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { healthz } from '../src/routes/healthz'
import { internalAuth } from '../src/middleware/internal-auth'

describe('healthz', () => {
  it('returns ok', async () => {
    const app = new Hono().route('/healthz', healthz)
    const res = await app.request('/healthz')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, service: 'orchestrator' })
  })
})

describe('internalAuth', () => {
  it('rejects missing token', async () => {
    process.env.INTERNAL_API_TOKEN = 'secret'
    const app = new Hono()
    app.use('*', internalAuth)
    app.get('/x', (c) => c.text('ok'))
    const res = await app.request('/x')
    expect(res.status).toBe(401)
  })
  it('accepts correct token', async () => {
    process.env.INTERNAL_API_TOKEN = 'secret'
    const app = new Hono()
    app.use('*', internalAuth)
    app.get('/x', (c) => c.text('ok'))
    const res = await app.request('/x', { headers: { 'x-internal-token': 'secret' } })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 7: Install + run tests**

Run:
```bash
pnpm install
pnpm vitest run apps/orchestrator
```
Expected: 3/3 pass.

- [ ] **Step 8: Manual smoke**

Run:
```bash
pnpm --filter @ao/orchestrator dev
```
In another terminal:
```bash
curl -s localhost:4000/healthz
curl -s localhost:4000/internal/ping
curl -s -H "x-internal-token: $(grep INTERNAL_API_TOKEN .env | cut -d= -f2)" localhost:4000/internal/ping
```
Expected: first → 200 ok; second → 401; third → 200 ok.
Stop dev server.

- [ ] **Step 9: Commit**

```bash
git add apps/orchestrator
git commit -m "feat(orchestrator): Hono skeleton with healthz + internal-auth middleware"
```

---

## Task 14: Combined `pnpm dev` script

**Files:**
- Create: `scripts/dev.ts`

- [ ] **Step 1: Implement `scripts/dev.ts`**

```ts
import { spawn } from 'node:child_process'

const procs = [
  { name: 'web         ', cmd: 'pnpm', args: ['--filter', '@ao/web', 'dev'], color: '\x1b[36m' },
  { name: 'orchestrator', cmd: 'pnpm', args: ['--filter', '@ao/orchestrator', 'dev'], color: '\x1b[35m' },
]

for (const p of procs) {
  const child = spawn(p.cmd, p.args, { stdio: ['ignore', 'pipe', 'pipe'] })
  const prefix = (s: string) => `${p.color}[${p.name}]\x1b[0m ${s}`
  child.stdout.on('data', (b) => process.stdout.write(prefix(b.toString())))
  child.stderr.on('data', (b) => process.stderr.write(prefix(b.toString())))
  child.on('exit', (code) => {
    console.error(prefix(`exited ${code}`))
    process.exit(code ?? 1)
  })
}

const shutdown = () => {
  console.log('\nShutting down…')
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

- [ ] **Step 2: Manual smoke**

Run:
```bash
pnpm dev
```
Expected: both Next.js and Orchestrator start; banner lines from both visible. In another terminal:
```bash
curl -s localhost:3000/healthz
curl -s localhost:4000/healthz
```
Both return JSON `ok: true`. Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add scripts/dev.ts
git commit -m "chore: pnpm dev runs Next + Orchestrator concurrently"
```

---

## Task 15: End-to-end smoke and README polish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run full local smoke**

```bash
pnpm dev
```

In a browser:
1. Visit `http://localhost:3000` → redirected to `/login`.
2. Visit `/signup` → create user → redirected to `/login?signedup=1`.
3. Sign in → redirected to `/`.
4. Click each sidebar link → placeholder pages render.
5. `Cmd+K` → palette opens → navigate.
6. Sign out from topbar → back at `/login`.
7. `curl localhost:4000/healthz` → orchestrator OK.

Stop dev server.

- [ ] **Step 2: Update `README.md`** to reflect verified setup

Replace contents with:

```markdown
# Agent Orchestrator

Local-first web orchestrator for `claude` / `codex` / `gemini` CLIs.

## Phase status

- [x] Phase 1 — Foundation (this repo's current scope)
- [ ] Phase 2 — Catalog CRUD
- [ ] Phase 3 — Single-agent dispatch
- [ ] Phase 4 — Rich chat UX
- [ ] Phase 5 — MCP Gateway
- [ ] Phase 6 — Multi-agent
- [ ] Phase 7 — Tokens + E2E

## Setup (macOS)

1. Install [Postgres.app](https://postgresapp.com), open it, click "Initialize" then "Start".
2. Ensure `psql --version` works in your shell (Postgres.app's "Configure $PATH" docs).
3. `cp .env.example .env`, then generate secrets:

   ```bash
   {
     echo "AUTH_SECRET=$(openssl rand -base64 32)"
     echo "SECRET_KEY=$(openssl rand -base64 32)"
     echo "INTERNAL_API_TOKEN=$(openssl rand -base64 32)"
   } >> .env
   ```

   Open `.env` and remove the empty placeholder lines for those three keys.

4. `createdb agent_orchestrator`
5. `pnpm install`
6. `pnpm --filter @ao/db prisma migrate dev`
7. `pnpm dev` (Next.js on :3000, Orchestrator on :4000)
8. Visit `http://localhost:3000` → create the first owner.

## Tests

```bash
pnpm test                # unit
pnpm test:integration    # integration (real Postgres, transactions per test)
```

## Repo layout

```
apps/web              Next.js 15 + Auth.js
apps/orchestrator     Hono service (long-running concerns)
packages/db           Prisma schema + client
packages/shared       Crypto + Zod validators
scripts/dev.ts        pnpm dev entrypoint
```
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with phase status and verified setup"
```

---

## Done criteria for Phase 1

All true at end of phase:
- [ ] `pnpm install` succeeds from clean clone.
- [ ] `pnpm --filter @ao/db prisma migrate dev` runs migrations cleanly.
- [ ] `pnpm dev` starts Next.js + Orchestrator concurrently with prefixed logs.
- [ ] First user can sign up at `/signup` and signup is disabled afterward.
- [ ] Signed-in user can navigate sidebar, open Cmd+K palette, sign out.
- [ ] `curl localhost:3000/healthz` and `curl localhost:4000/healthz` both return JSON `ok:true`.
- [ ] Orchestrator `/internal/*` returns 401 without `x-internal-token`.
- [ ] `pnpm test` runs all unit tests green.
- [ ] `pnpm test:integration` runs the signup integration test green.

---

## Self-Review Notes

**Spec coverage check (Phase 1 slice):**
- Auth: `none|local|team` modes ✓ (env handling + signup gate)
- Schema base: User/Account/Session/VerificationToken/AuditLog ✓
- Crypto helpers: AES-256-GCM with key versioning ✓
- Process topology: Next + Orchestrator + internal-token boundary ✓
- Dev ergonomics: single `pnpm dev` ✓
- Out of scope for Phase 1 (covered later): Provider catalog, Personas, Roles, Skills, Plugins, MCP, Projects, Components, Tickets, Agents, Orchestrator dispatch, Slash, Refs, Attachments, Multi-agent, Token tracking, MCP Gateway, E2E suite — these are Phase 2-7.

**Type/name consistency:**
- `@ao/db`, `@ao/shared`, `@ao/web`, `@ao/orchestrator` package names consistent.
- `prisma` exported as named singleton from both `@ao/db` and `apps/web/lib/prisma.ts` (re-export).
- `resolveAuthMode`, `isSignupAllowed`, `signupAction` referenced consistently across tasks 7 + 8.
- `INTERNAL_API_TOKEN` env var matches header `x-internal-token` everywhere.
