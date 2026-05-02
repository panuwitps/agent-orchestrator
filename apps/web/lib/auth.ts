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
