import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_TOKEN = 'gs_session_token';
const VALID_TOKEN = 'genzy_studio_auth_34635bc';
// Pages that don't require auth
const PUBLIC_PATHS = ['/login', '/privacy', '/accounts/meta-select'];
// Pages that should redirect authenticated users to dashboard (login only)
const LOGIN_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes and static files through
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_TOKEN)?.value;
  const isAuthenticated = token === VALID_TOKEN;
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const isLoginPath = LOGIN_PATHS.some(p => pathname.startsWith(p));

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Only redirect authenticated users away from login page (not meta-select or privacy)
  if (isAuthenticated && isLoginPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
