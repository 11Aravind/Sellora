import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // ---------------------------------------------------------------------------
  // 1. Auth Protection for Dashboard, Onboarding, and Super-Admin routes
  // ---------------------------------------------------------------------------
  const protectedPrefixes = ["/dashboard", "/onboarding", "/super-admin"];
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const nextPath = `${pathname}${search}`;
    const loginUrl = new URL(`/login?next=${encodeURIComponent(nextPath)}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ---------------------------------------------------------------------------
  // 2. Redirect logged-in users away from auth pages to their resolved home
  // ---------------------------------------------------------------------------
  const authRoutes = ["/login", "/signup", "/forgot-password"];
  if (user && authRoutes.includes(pathname)) {
    // If user is already authenticated and visits login/signup, let them proceed or let layout handle
  }

  // ---------------------------------------------------------------------------
  // TODO: Tenant subdomain and custom domain routing will be added in Prompt 04.
  // Host header parsing, store slug resolution, and URL rewrites to /stores/[slug]
  // will be performed here.
  // ---------------------------------------------------------------------------

  return response;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images and media (svg, png, jpg, jpeg, gif, webp)
     * - common static files with extensions (.*\\..*)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
