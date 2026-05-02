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

export const Effort = z.enum(['low', 'medium', 'high', 'max'])
export type Effort = z.infer<typeof Effort>

export const SkillInput = z.object({
  name: NonEmptyString,
  description: z.string().max(1000),
  content: z.string().max(100_000),
  frontmatter: z.record(z.unknown()).default({}),
  compatibleProviders: z.array(z.string()).default([]),
})
export type SkillInput = z.infer<typeof SkillInput>

export const RoleInput = z.object({
  name: NonEmptyString,
  description: z.string().max(1000),
  systemPrompt: z.string().max(50_000),
  defaultProviderId: z.string().nullable().optional(),
  defaultModel: z.string().nullable().optional(),
  defaultEffort: Effort.default('high'),
  toolPermissions: z.object({
    read: z.boolean().default(true),
    edit: z.boolean().default(true),
    bash: z.boolean().default(true),
    webFetch: z.boolean().default(true),
  }).default({ read: true, edit: true, bash: true, webFetch: true }),
  skillIds: z.array(z.string()).default([]),
})
export type RoleInput = z.infer<typeof RoleInput>

export const PersonaInput = z.object({
  name: NonEmptyString,
  description: z.string().max(1000),
  identityPrompt: z.string().max(20_000),
  avatarUrl: z.string().url().nullable().optional(),
  roleIds: z.array(z.string()).default([]),
  defaultRoleId: z.string().nullable().optional(),
})
export type PersonaInput = z.infer<typeof PersonaInput>

export const PluginInput = z.object({
  name: NonEmptyString,
  version: z.string().max(64).default('latest'),
  source: z.enum(['claude_marketplace', 'manual_path']).default('claude_marketplace'),
  config: z.record(z.unknown()).default({}),
})
export type PluginInput = z.infer<typeof PluginInput>

export const McpServerInput = z.object({
  name: NonEmptyString,
  description: z.string().max(1000),
  transport: z.enum(['stdio', 'http', 'sse']),
  command: z.string().nullable().optional(),
  args: z.array(z.string()).default([]),
  url: z.string().url().nullable().optional(),
  env: z.record(z.string()).default({}),               // plaintext at edit time; encrypted on store
  compatibleProviders: z.array(z.string()).default([]),
})
export type McpServerInput = z.infer<typeof McpServerInput>

export const ProjectInput = z.object({
  name: NonEmptyString,
  description: z.string().max(1000),
})
export type ProjectInput = z.infer<typeof ProjectInput>

export const ComponentInput = z.object({
  name: NonEmptyString,
  path: z.string().min(1).max(1024),
  description: z.string().max(1000),
  env: z.record(z.string()).default({}),
})
export type ComponentInput = z.infer<typeof ComponentInput>
