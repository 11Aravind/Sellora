export type ParsedHost =
  | { kind: "root" }
  | { kind: "subdomain"; slug: string }
  | { kind: "custom"; domain: string };

export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "dashboard",
  "super-admin",
  "static",
  "assets",
  "mail",
  "support",
  "help",
  "blog",
  "docs",
  "status",
  "login",
  "signup",
]);

/**
 * Strips the port from a host string and returns it in lowercase.
 * Example: "shop-a.localhost:3000" -> "shop-a.localhost"
 */
export function stripPort(host: string): string {
  if (!host) return "";
  const cleaned = host.trim().toLowerCase();
  // If host is IPv6 format like [::1]:3000
  if (cleaned.startsWith("[")) {
    const endBracket = cleaned.indexOf("]");
    return endBracket !== -1 ? cleaned.slice(1, endBracket) : cleaned;
  }
  return cleaned.split(":")[0];
}

/**
 * Parses a host header and determines if it is the root domain,
 * a tenant subdomain, or a custom domain.
 *
 * @param hostHeader - The Host or X-Forwarded-Host header value
 * @param rootDomain - The configured root domain (e.g. "localhost:3000" or "yourdomain.com")
 */
export function parseHost(
  hostHeader: string | null | undefined,
  rootDomain: string | null | undefined = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000"
): ParsedHost {
  const host = stripPort(hostHeader || "");
  const root = stripPort(rootDomain || "localhost:3000");

  if (!host) {
    return { kind: "root" };
  }

  // 1. Exact match with root domain
  if (host === root) {
    return { kind: "root" };
  }

  // 2. Check for subdomain of the root domain (e.g. host: "shop-a.yourdomain.com", root: "yourdomain.com")
  const rootSuffix = `.${root}`;
  if (host.endsWith(rootSuffix)) {
    const candidate = host.slice(0, host.length - rootSuffix.length);

    // If candidate has nested parts (e.g. "a.b"), we only take the lowest segment if valid,
    // or treat as custom if invalid. Standard slugs are single level.
    const parts = candidate.split(".");
    const slug = parts[parts.length - 1];

    if (!slug || RESERVED_SUBDOMAINS.has(slug)) {
      return { kind: "root" };
    }

    return { kind: "subdomain", slug };
  }

  // 3. Special handling for localhost in development: "*.localhost"
  // When root is "localhost", host may be "shop-a.localhost" or "store.shop-a.localhost"
  if (root === "localhost" || host.endsWith(".localhost")) {
    const parts = host.split(".");
    if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
      const slug = parts[parts.length - 2];
      if (!slug || RESERVED_SUBDOMAINS.has(slug)) {
        return { kind: "root" };
      }
      return { kind: "subdomain", slug };
    }
  }

  // 4. Special handling for "lvh.me" (common local testing wildcard domain resolving to 127.0.0.1)
  if (host.endsWith(".lvh.me")) {
    const parts = host.split(".");
    if (parts.length >= 3) {
      const slug = parts[parts.length - 3];
      if (!slug || RESERVED_SUBDOMAINS.has(slug)) {
        return { kind: "root" };
      }
      return { kind: "subdomain", slug };
    }
    return { kind: "root" };
  }

  // 5. Special handling for Vercel deployment domains (*.vercel.app)
  // Direct access to a vercel.app deployment (e.g. "sellora-bay.vercel.app") is always root platform
  if (host.endsWith(".vercel.app")) {
    return { kind: "root" };
  }

  // 6. If host does not match root domain or known subdomain patterns, treat as custom domain
  return { kind: "custom", domain: host };
}
