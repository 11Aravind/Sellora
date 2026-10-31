import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveHome } from "@/features/auth/queries";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      const homePath = await resolveHome(data.user);
      return NextResponse.redirect(`${origin}${homePath}`);
    }
  }

  // Return the user to an error page or login page with an error code
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
