import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Plan = Database["public"]["Tables"]["plans"]["Row"];

export async function getActivePlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[getActivePlans error]:", error);
    return [];
  }

  return data;
}
