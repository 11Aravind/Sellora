import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAnonClient();
    const { count, error } = await supabase
      .from("plans")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, plans: count ?? 0 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
