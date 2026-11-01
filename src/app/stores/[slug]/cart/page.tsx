import { notFound } from "next/navigation";
import { getStorefrontTenant } from "@/features/storefront/queries";
import { CartView } from "@/features/storefront/components/CartView";

export default async function StorefrontCartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getStorefrontTenant(slug);

  if (!tenant) {
    notFound();
  }

  return <CartView tenantId={tenant.id} />;
}

