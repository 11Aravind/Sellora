export interface StorefrontTenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
  is_open: boolean;
}
