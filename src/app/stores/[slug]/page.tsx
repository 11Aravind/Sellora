import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  getStorefrontTenant,
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/features/storefront/queries";
import { ProductCard } from "@/features/storefront/components/ProductCard";
import { buttonVariants } from "@/components/ui/button";

export default async function StorefrontHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getStorefrontTenant(slug);

  if (!tenant) {
    notFound();
  }

  // Fetch categories and new arrivals (limit 12)
  const [categories, { products: newArrivals }] = await Promise.all([
    getStorefrontCategories(tenant.id),
    getStorefrontProducts({ tenantId: tenant.id, limit: 12, sort: "newest" }),
  ]);

  const tagline = (tenant.settings?.tagline as string) || "Welcome to our store";
  const bannerUrl = (tenant.settings?.bannerUrl as string) || null;

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-muted/20 border border-border/60 p-8 sm:p-12 lg:p-16">
        {bannerUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{ backgroundImage: `url(${bannerUrl})` }}
            aria-hidden="true"
          />
        )}
        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Featured Store</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            {tenant.name}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {tagline}
          </p>
          <div className="pt-2">
            <Link
              href="/products"
              className={buttonVariants({ size: "lg", className: "gap-2 shadow-sm" })}
            >
              <span>Browse Catalog</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Strip */}
      {categories.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Shop by Category
            </h2>
            <Link
              href="/products"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <Link
              href="/products"
              className="inline-flex items-center rounded-full border border-border/80 bg-background px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
            >
              All Categories
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="inline-flex items-center rounded-full border border-border/80 bg-background px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              New Arrivals
            </h2>
            <p className="text-xs text-muted-foreground">
              Explore our latest curated products
            </p>
          </div>
          <Link
            href="/products"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1 text-xs" })}
          >
            <span>View catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {newArrivals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No products available right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
