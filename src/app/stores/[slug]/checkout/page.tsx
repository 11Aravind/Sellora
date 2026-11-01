import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontTenant } from "@/features/storefront/queries";
import { CheckoutView } from "@/features/storefront/components/CheckoutView";

export default async function StorefrontCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getStorefrontTenant(slug);

  if (!tenant) {
    notFound();
  }

  // Prompt requirement: Checkout requires login; unauthenticated customers are sent to /login?next=/checkout
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/checkout");
  }

  return (
    <CheckoutView
      tenantId={tenant.id}
      tenantName={tenant.name}
      userEmail={user.email || ""}
      userName={user.user_metadata?.full_name || null}
    />
  );
}

