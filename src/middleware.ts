import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/** Add headers that prevent the browser from showing a cached
 *  authenticated page after sign-out (back/forward cache). */
function noStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.headers.set('Pragma',        'no-cache');
  res.headers.set('Expires',       '0');
  return res;
}

// Paths only admins are allowed to view. Anything matching one of these and
// reached by a non-admin is redirected to /login.
const ADMIN_ONLY_PREFIXES = [
  '/admin',
  '/api/admin',
  '/cores',
  '/capif',
  '/monitoring',
  '/qod',
  '/location',
  '/traffic-influence',
  '/number-verification',
  '/device-status',
  '/sim-swap',
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const roles = (req.nextauth?.token?.roles as string[] | undefined) ?? [];

    const isAdminPath = ADMIN_ONLY_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (isAdminPath && !roles.includes('admin')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return noStore(NextResponse.redirect(url));
    }
    return noStore(NextResponse.next());
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: '/login' },
  },
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/developer/:path*',
    '/api/invokers/:path*',
    '/api/developer/:path*',
    '/cores/:path*',
    '/capif/:path*',
    '/monitoring/:path*',
    '/qod/:path*',
    '/location/:path*',
    '/traffic-influence/:path*',
    '/number-verification/:path*',
    '/device-status/:path*',
    '/sim-swap/:path*',
  ],
};
