import { notFound } from "next/navigation";
import { getStorefrontTenant } from "@/features/storefront/queries";
import { CustomerLoginForm } from "@/features/storefront/components/CustomerLoginForm";

export default async function CustomerLoginPage({
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
      <CustomerLoginForm tenantName={tenant.name} />
    </div>
  );
}

