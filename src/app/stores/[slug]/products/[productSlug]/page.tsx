import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import {
  getStorefrontTenant,
  getStorefrontProductBySlug,
} from "@/features/storefront/queries";
import { ProductGallery } from "@/features/storefront/components/ProductGallery";
import { AddToCartButton } from "@/features/storefront/components/AddToCartButton";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const tenant = await getStorefrontTenant(slug);
  if (!tenant) return {};

  const product = await getStorefrontProductBySlug(tenant.id, productSlug);
  if (!product) return {};

  const ogImages = product.primary_image ? [product.primary_image] : [];

  return {
    title: `${product.name} | ${tenant.name}`,
    description: product.description || `Buy ${product.name} at ${tenant.name}`,
    openGraph: {
      title: `${product.name} | ${tenant.name}`,
      description: product.description || `Buy ${product.name} at ${tenant.name}`,
      images: ogImages,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const tenant = await getStorefrontTenant(slug);
  if (!tenant) {
    notFound();
  }

  const product = await getStorefrontProductBySlug(tenant.id, productSlug);

  // Manual check requirement: Draft/archived products never appear and direct URLs return 404
  if (!product || product.status !== "active") {
    notFound();
  }

  const isOutOfStock = product.track_inventory && product.stock <= 0;
  const isLowStock =
    product.track_inventory &&
    product.stock > 0 &&
    product.low_stock_threshold !== null &&
    product.stock <= product.low_stock_threshold;

  const hasDiscount =
    product.compare_at_price !== null &&
    product.compare_at_price > product.price;

  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  // JSON-LD structured data for search engines
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.map((img) => img.url) || [product.primary_image],
    description: product.description || undefined,
    sku: product.sku || undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: isOutOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: `/products/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-10 pb-16">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="hover:text-foreground transition-colors">
            Products
          </Link>
          {product.category_name && product.category_slug && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link
                href={`/products?category=${encodeURIComponent(product.category_slug)}`}
                className="hover:text-foreground transition-colors"
              >
                {product.category_name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column: Image Gallery */}
          <div>
            <ProductGallery
              images={product.images || []}
              productName={product.name}
            />
          </div>

          {/* Right Column: Information & Actions */}
          <div className="flex flex-col space-y-6">
            <div>
              {product.category_name && (
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {product.category_name}
                </p>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {product.name}
              </h1>
              {product.sku && (
                <p className="text-xs text-muted-foreground mt-1">
                  SKU: {product.sku}
                </p>
              )}
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-3 border-y border-border/60 py-4">
              <span className="text-3xl font-bold text-foreground">
                ₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{product.compare_at_price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <Badge variant="destructive" className="text-xs font-bold">
                    Save {discountPercent}%
                  </Badge>
                </>
              )}
            </div>

            {/* Stock State Badge */}
            <div className="flex items-center gap-2">
              {isOutOfStock ? (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs px-2.5 py-1">
                  Out of Stock
                </Badge>
              ) : isLowStock ? (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-2.5 py-1">
                  Only {product.stock} items remaining
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-1">
                  In Stock & Ready to Ship
                </Badge>
              )}
            </div>

            {/* Add to Cart Stepper */}
            <div className="pt-2">
              <AddToCartButton product={product} />
            </div>

            {/* Guarantees / Badges */}
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-medium text-foreground">Cash On Delivery</span>
                <span className="text-[10px] text-muted-foreground">Pay when delivered</span>
              </div>
              <div className="flex flex-col items-center gap-1 border-x border-border/60 px-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-medium text-foreground">100% Genuine</span>
                <span className="text-[10px] text-muted-foreground">Direct from store</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] font-medium text-foreground">Easy Support</span>
                <span className="text-[10px] text-muted-foreground">Vendor backed</span>
              </div>
            </div>

            {/* Product Description */}
            {product.description && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Description
                </h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

