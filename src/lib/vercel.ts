import "server-only";

interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  redirect?: string | null;
  redirectStatusCode?: number | null;
  gitBranch?: string | null;
  updatedAt?: number;
  createdAt?: number;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

interface VercelDomainConfigResponse {
  configuredBy?: "CNAME" | "A" | "http" | "dns-01" | null;
  acceptedChallenges?: string[];
  misconfigured: boolean;
  error?: {
    code: string;
    message: string;
  };
}

function getVercelAuth() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return null;
  }

  const teamParam = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  return { token, projectId, teamId, teamParam, headers };
}

/**
 * Checks if Vercel API credentials are fully configured.
 */
export function isVercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

/**
 * Adds a custom domain to the Vercel project.
 */
export async function addDomainToVercel(
  domain: string
): Promise<{ success: boolean; data?: VercelDomainResponse; error?: string }> {
  const auth = getVercelAuth();
  if (!auth) {
    return {
      success: false,
      error: "Vercel API credentials not configured (VERCEL_API_TOKEN, VERCEL_PROJECT_ID).",
    };
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${auth.projectId}/domains${auth.teamParam}`,
      {
        method: "POST",
        headers: auth.headers,
        body: JSON.stringify({ name: domain }),
      }
    );

    const json = (await res.json()) as VercelDomainResponse;

    if (!res.ok || json.error) {
      // If domain already exists on project, treat as success so we can verify it
      if (json.error?.code === "domain_already_in_use" || res.status === 409) {
        return { success: true, data: json };
      }
      return { success: false, error: json.error?.message || "Failed to add domain to Vercel." };
    }

    return { success: true, data: json };
  } catch (err) {
    console.error("[addDomainToVercel] Error:", err);
    return { success: false, error: "Network error connecting to Vercel API." };
  }
}

/**
 * Triggers verification of a domain on Vercel.
 */
export async function verifyDomainOnVercel(
  domain: string
): Promise<{ verified: boolean; error?: string }> {
  const auth = getVercelAuth();
  if (!auth) {
    return {
      verified: false,
      error: "Vercel API credentials not configured.",
    };
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${auth.projectId}/domains/${encodeURIComponent(domain)}/verify${auth.teamParam}`,
      {
        method: "POST",
        headers: auth.headers,
      }
    );

    const json = (await res.json()) as VercelDomainResponse;

    if (!res.ok || json.error) {
      return { verified: false, error: json.error?.message || "Domain verification failed." };
    }

    return { verified: Boolean(json.verified) };
  } catch (err) {
    console.error("[verifyDomainOnVercel] Error:", err);
    return { verified: false, error: "Network error connecting to Vercel API." };
  }
}

/**
 * Checks DNS configuration status for a domain on Vercel.
 */
export async function getVercelDomainConfig(
  domain: string
): Promise<{ misconfigured: boolean; configuredBy?: string | null; error?: string }> {
  const auth = getVercelAuth();
  if (!auth) {
    return { misconfigured: true, error: "Vercel API credentials not configured." };
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v6/domains/${encodeURIComponent(domain)}/config${auth.teamParam}`,
      {
        headers: auth.headers,
      }
    );

    const json = (await res.json()) as VercelDomainConfigResponse;

    if (!res.ok || json.error) {
      return { misconfigured: true, error: json.error?.message || "Failed to fetch domain config." };
    }

    return {
      misconfigured: Boolean(json.misconfigured),
      configuredBy: json.configuredBy || null,
    };
  } catch (err) {
    console.error("[getVercelDomainConfig] Error:", err);
    return { misconfigured: true, error: "Network error connecting to Vercel API." };
  }
}

/**
 * Removes a domain from the Vercel project.
 */
export async function removeDomainFromVercel(
  domain: string
): Promise<{ success: boolean; error?: string }> {
  const auth = getVercelAuth();
  if (!auth) {
    return { success: true }; // Skip if not configured
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${auth.projectId}/domains/${encodeURIComponent(domain)}${auth.teamParam}`,
      {
        method: "DELETE",
        headers: auth.headers,
      }
    );

    if (!res.ok && res.status !== 404) {
      const json = await res.json();
      return { success: false, error: json.error?.message || "Failed to remove domain from Vercel." };
    }

    return { success: true };
  } catch (err) {
    console.error("[removeDomainFromVercel] Error:", err);
    return { success: false, error: "Network error connecting to Vercel API." };
  }
}

