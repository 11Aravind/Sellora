import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type TenantRole = Database["public"]["Tables"]["tenant_members"]["Row"]["role"];
export type TenantStatus = Database["public"]["Tables"]["tenants"]["Row"]["status"];

export interface MyTenant {
  id: string;
  slug: string;
  name: string;
  role: TenantRole;
  status: TenantStatus;
}

export interface AuthContextUser {
  user: User;
  profile: Profile | null;
  tenants: MyTenant[];
  isPlatformAdmin: boolean;
}
