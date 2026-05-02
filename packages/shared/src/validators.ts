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
