import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/features/payments/crypto";

type GatewayDbClient = {
  select: (cols: string) => {
    eq: (col: string, val: unknown) => {
      eq: (col2: string, val2: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
      };
      single: () => Promise<{ data: unknown; error: Error | null }>;
    };
  };
  insert: (vals: Record<string, unknown>) => Promise<{ error: Error | null }>;
  update: (vals: Record<string, unknown>) => {
    eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
  };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const clientId = process.env.RAZORPAY_PARTNER_CLIENT_ID;
  const clientSecret = process.env.RAZORPAY_PARTNER_CLIENT_SECRET;

  const adminSupabase = createAdminClient();

  // If Razorpay returns an error directly
  if (oauthError) {
    console.error("[Razorpay OAuth callback error]:", oauthError, errorDescription);
    return NextResponse.redirect(new URL("/dashboard?error=oauth_failed", request.url));
  }

  if (!code || !state || !clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/dashboard?error=invalid_callback_params", request.url)
    );
  }

  // 1. Verify signed state parameter
  const [statePayload, signature] = state.split(".");
  if (!statePayload || !signature) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state_format", request.url));
  }

  const expectedSignature = crypto
    .createHmac("sha256", clientSecret)
    .update(statePayload)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "utf8");
  const expectedSigBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    return NextResponse.redirect(new URL("/dashboard?error=state_verification_failed", request.url));
  }

  let parsedState: { tenantId: string; nonce: string; timestamp: number };
  try {
    parsedState = JSON.parse(Buffer.from(statePayload, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(new URL("/dashboard?error=malformed_state", request.url));
  }

  const { tenantId, timestamp } = parsedState;

  // Verify state age (expires after 15 minutes)
  if (Date.now() - timestamp > 15 * 60 * 1000) {
    return NextResponse.redirect(new URL("/dashboard?error=state_expired", request.url));
  }

  // Find tenant slug for safe redirect
  const { data: rawTenant } = await (adminSupabase.from("tenants") as unknown as GatewayDbClient)
    .select("slug")
    .eq("id", tenantId)
    .single();

  const tenant = rawTenant as { slug?: string } | null;
  const slug = tenant?.slug || "";
  const redirectTarget = slug
    ? `/dashboard/${slug}/settings/payments`
    : "/dashboard";

  // 2. Exchange authorization code for access and refresh tokens
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const redirectUri = `${protocol}://${host}/api/auth/razorpay/callback`;

  const gatewayTable = adminSupabase.from("tenant_payment_gateways") as unknown as GatewayDbClient;

  // Check if record exists
  const { data: existingRow } = await gatewayTable
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("gateway_name", "razorpay")
    .maybeSingle();

  const existingGateway = existingRow as { id: string } | null;

  try {
    const tokenRes = await fetch("https://auth.razorpay.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[Razorpay Token Exchange Failed]:", tokenRes.status, errBody);

      const failPayload = {
        tenant_id: tenantId,
        gateway_name: "razorpay",
        connection_status: "connection_failed",
        metadata: {
          failed_at: new Date().toISOString(),
          error: "Token exchange rejected by gateway",
        },
      };

      if (existingGateway?.id) {
        await gatewayTable.update(failPayload).eq("id", existingGateway.id);
      } else {
        await gatewayTable.insert(failPayload);
      }

      return NextResponse.redirect(new URL(`${redirectTarget}?status=failed`, request.url));
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      razorpay_account_id?: string;
      token_type?: string;
    };

    const encryptedAccess = encryptToken(tokenData.access_token);
    const encryptedRefresh = tokenData.refresh_token
      ? encryptToken(tokenData.refresh_token)
      : null;

    const tokenExpiry = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // 3. Save connection details securely in tenant_payment_gateways
    const successPayload = {
      tenant_id: tenantId,
      gateway_name: "razorpay",
      gateway_account_id: tokenData.razorpay_account_id || null,
      connection_status: "connected",
      encrypted_access_token: encryptedAccess,
      encrypted_refresh_token: encryptedRefresh,
      token_expiry: tokenExpiry,
      metadata: {
        connected_at: new Date().toISOString(),
        razorpay_account_id: tokenData.razorpay_account_id,
      },
    };

    if (existingGateway?.id) {
      await gatewayTable.update(successPayload).eq("id", existingGateway.id);
    } else {
      await gatewayTable.insert(successPayload);
    }

    return NextResponse.redirect(new URL(`${redirectTarget}?status=connected`, request.url));
  } catch (err) {
    console.error("[Razorpay OAuth Callback Exception]:", err);
    return NextResponse.redirect(new URL(`${redirectTarget}?status=error`, request.url));
  }
}
