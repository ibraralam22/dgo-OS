import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Proxy (proxy.ts) — runs before every matched request.
 *
 * Auth strategy:
 *  - On login, auth-store.ts writes a lightweight `auth_present=1` cookie.
 *  - On logout, that cookie is cleared.
 *  - This proxy reads that cookie to decide whether a session is active.
 *  - Real security enforcement is JWT verification on the backend; this
 *    is a UX guard that prevents unnecessary page loads for unauthed users.
 *
 * Protected:  /dashboard/**  → redirect to /login if no session cookie
 * Auth gate:  /login, /      → redirect to /dashboard if session exists
 * Passthrough: everything else
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('auth_present');

  // ── Protected routes ───────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Auth-only routes ───────────────────────────────────────────────────────
  // Bounce already-authenticated users away from the login/root pages
  if (pathname === '/login' || pathname === '/') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match every path EXCEPT:
     *  _next/static  – built assets
     *  _next/image   – image optimisation API
     *  favicon.ico
     *  api/proxy     – our backend rewrite (handled by next.config.ts)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/proxy).*)',
  ],
};
