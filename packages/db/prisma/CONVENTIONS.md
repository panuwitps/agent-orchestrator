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
- Every FK column on the *referencing* side gets `@@index([ownerId])` (or whatever the FK is) — Postgres does not auto-index FK referencing columns, and cascade deletes seq-scan otherwise.
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
- `Role` deletion cascades to its own attachment tables (`RoleSkill`, `RolePlugin`, `RoleMcp`) — those rows are role-specific config.
- `Persona` deletion cascades to `PersonaRole` for the same reason.
- `Skill`, `McpServer`, `Plugin` referenced from a junction use `onDelete: Restrict` so the catalog entity can't be deleted while attached — un-attach from the Role first. Same for `PersonaRole.role` (`Restrict` so a Role isn't silently removed from Personas that depend on it).
