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
