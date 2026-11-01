import { notFound } from "next/navigation";
import { getStorefrontTenant } from "@/features/storefront/queries";
import { CustomerSignupForm } from "@/features/storefront/components/CustomerSignupForm";

export default async function CustomerSignupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getStorefrontTenant(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="py-12 sm:py-16">
      <CustomerSignupForm tenantName={tenant.name} />
    </div>
  );
}

