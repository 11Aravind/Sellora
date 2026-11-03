import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { parseHost } from "@/lib/tenancy/host";
import { resolveCustomDomain } from "@/lib/tenancy/resolve";

/**
 * Copies cookies from a source response (e.g., Supabase session refresh)
 * to a target response (such as a redirect or rewrite).
 */
function applyCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

export async function proxy(request: NextRequest) {
  // 1. Maintain Supabase session refresh
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const hostHeader =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  const parsedHost = parseHost(hostHeader, rootDomain);
  const isProd = process.env.NODE_ENV === "production";
  const protocol = rootDomain.includes("localhost") ? "http" : "https";

  // ---------------------------------------------------------------------------
  // 2. Tenant Hosts (Subdomains & Custom Domains)
  // ---------------------------------------------------------------------------
  if (parsedHost.kind === "subdomain" || parsedHost.kind === "custom") {
    // A. Guard: Never serve /dashboard or /super-admin on tenant hosts
    if (
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname === "/super-admin" ||
      pathname.startsWith("/super-admin/")
    ) {
      const redirectUrl = new URL(
        `${protocol}://${rootDomain}${pathname}${search}`
      );
      return applyCookies(response, NextResponse.redirect(redirectUrl));
    }

    // B. Do NOT rewrite system and webhook paths
    const bypassPrefixes = [
      "/_next",
      "/api/webhooks",
      "/auth/callback",
      "/api/health",
    ];
    const shouldBypass = bypassPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (shouldBypass) {
      return response;
    }

    // C. Determine the store slug
    let storeSlug: string | null = null;
    if (parsedHost.kind === "subdomain") {
      storeSlug = parsedHost.slug;
    } else {
      // Custom domain: resolve slug via RPC with 60s memory cache
      storeSlug = await resolveCustomDomain(parsedHost.domain);
      if (!storeSlug) {
        // Unknown custom host -> 404 page
        const notFoundUrl = new URL("/_not-found", request.url);
        const notFoundResponse = NextResponse.rewrite(notFoundUrl, {
          status: 404,
        });
        return applyCookies(response, notFoundResponse);
      }
    }

    // D. Rewrite path to /stores/{slug}{pathname}
    const targetPath = pathname.startsWith(`/stores/${storeSlug}`)
      ? pathname
      : `/stores/${storeSlug}${pathname === "/" ? "" : pathname}`;

    const rewriteUrl = new URL(`${targetPath}${search}`, request.url);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-slug", storeSlug);
    if (parsedHost.kind === "custom") {
      requestHeaders.set("x-tenant-domain", parsedHost.domain);
    }

    const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });

    return applyCookies(response, rewriteResponse);
  }

  // ---------------------------------------------------------------------------
  // 3. Root Host Routing
  // ---------------------------------------------------------------------------

  // In production with custom root domain: redirect /stores/{slug}/... to https://{slug}.{rootDomain}/...
  // Do not redirect on *.vercel.app because Vercel does not support wildcard SSL on vercel.app domains.
  const canUseWildcardSubdomains =
    !rootDomain.includes("localhost") && !rootDomain.endsWith(".vercel.app");

  if (isProd && canUseWildcardSubdomains && pathname.startsWith("/stores/")) {
    const parts = pathname.slice("/stores/".length).split("/");
    const slug = parts[0];
    const rest = parts.slice(1).join("/");
    const destinationPath = rest ? `/${rest}` : "";

    if (slug) {
      const canonicalUrl = new URL(
        `${protocol}://${slug}.${rootDomain}${destinationPath}${search}`
      );
      return applyCookies(response, NextResponse.redirect(canonicalUrl, 301));
    }
  }

  // Auth Protection for Dashboard, Onboarding, and Super-Admin on root host
  const protectedPrefixes = ["/dashboard", "/onboarding", "/super-admin"];
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !user) {
    const nextPath = `${pathname}${search}`;
    const loginUrl = new URL(
      `/login?next=${encodeURIComponent(nextPath)}`,
      request.url
    );
    return applyCookies(response, NextResponse.redirect(loginUrl));
  }

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
