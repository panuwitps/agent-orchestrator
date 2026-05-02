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
