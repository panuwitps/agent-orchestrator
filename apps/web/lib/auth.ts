import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { LoginInput } from '@ao/shared'
import { prisma } from './prisma'
import { resolveAuthMode } from './auth-mode'

type AppRole = 'OWNER' | 'ADMIN' | 'MEMBER'

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: AppRole } & DefaultSession['user']
  }
}

// JWT session strategy is required for Edge middleware: a database lookup
// (PrismaAdapter.getSessionAndUser) cannot run in Next.js Edge runtime.
// PrismaAdapter is still useful for OAuth account/user records when those
// providers are added in team mode.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const mode = resolveAuthMode()
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
    jwt: ({ token, user }) => {
      if (user) {
        const u = user as { id?: string; role?: AppRole }
        ;(token as Record<string, unknown>).id = u.id
        ;(token as Record<string, unknown>).role = u.role
      }
      return token
    },
    session: ({ session, token }) => {
      const t = token as { id?: string; role?: AppRole }
      const sUser = session.user as { id: string; role: AppRole } & DefaultSession['user']
      sUser.id = t.id ?? ''
      sUser.role = t.role ?? 'MEMBER'
      return session
    },
  },
})
