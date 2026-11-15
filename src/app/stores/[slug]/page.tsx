import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Headphones,
  Diamond,
  Truck,
  RotateCcw,
} from "lucide-react";
import {
  getStorefrontTenant,
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/features/storefront/queries";
import { ProductCard } from "@/features/storefront/components/ProductCard";
import { buttonVariants } from "@/components/ui/button";
import { getThemeConfig } from "@/features/themes/templates";

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

  // Fetch categories and products (limit 12)
  const [categories, { products: newArrivals }] = await Promise.all([
    getStorefrontCategories(tenant.id),
    getStorefrontProducts({ tenantId: tenant.id, limit: 12, sort: "newest" }),
  ]);

  const themeConfig = getThemeConfig(tenant.settings?.theme as string);
  const bannerUrl = (tenant.settings?.bannerUrl as string) || null;
  const rawTagline = tenant.settings?.tagline as string | undefined;

  const isVibrant = themeConfig.id === "vibrant-retail";
  const isBoutique = themeConfig.id === "classic-boutique";

  const headline = themeConfig.heroHeadline;
  const subtext =
    rawTagline && rawTagline.trim() !== "Welcome to our store"
      ? rawTagline
      : themeConfig.heroSubtext;

  return (
    <div className="container mx-auto px-4 sm:px-6 space-y-12 py-8 pb-20">
      {/* 1. HERO BANNER */}
      {isVibrant ? (
        /* VIBRANT RETAIL HERO */
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#03150f] via-[#05241b] to-[#041c14] border border-emerald-950 p-8 sm:p-12 lg:p-16 text-white shadow-xl">
          {bannerUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url(${bannerUrl})` }}
              aria-hidden="true"
            />
          )}
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Next-Gen Electronics & Deals</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {headline}
              </h1>
              <p className="text-base sm:text-lg text-emerald-100/70 leading-relaxed">
                {subtext}
              </p>
              <div className="pt-2">
                <Link
                  href="/products"
                  className={buttonVariants({
                    size: "lg",
                    className:
                      "gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-full px-7 shadow-lg shadow-emerald-950/50",
                  })}
                >
                  <span>{themeConfig.heroCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* High-Tech Headphones Graphic */}
            <div className="relative h-44 w-44 sm:h-56 sm:w-56 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-2xl">
                <circle cx="50" cy="50" r="38" fill="#10b981" opacity="0.15" />
                <path
                  d="M26 56 C24 30 76 30 74 56"
                  stroke="#0f172a"
                  strokeWidth="7"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M26 56 C24 30 76 30 74 56"
                  stroke="#334155"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <rect x="20" y="52" width="12" height="24" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="23" y="56" width="6" height="16" rx="3" fill="#0f172a" />
                <rect x="68" y="52" width="12" height="24" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="71" y="56" width="6" height="16" rx="3" fill="#0f172a" />
                <circle cx="26" cy="64" r="2.5" fill="#10b981" />
                <circle cx="74" cy="64" r="2.5" fill="#10b981" />
              </svg>
            </div>
          </div>
        </section>
      ) : isBoutique ? (
        /* CLASSIC BOUTIQUE HERO */
        <section className="relative overflow-hidden rounded-3xl bg-[#f4eee4] border border-stone-300/80 p-8 sm:p-12 lg:p-16 text-stone-900 shadow-xs">
          {bannerUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15"
              style={{ backgroundImage: `url(${bannerUrl})` }}
              aria-hidden="true"
            />
          )}
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8 font-serif">
            <div className="max-w-xl space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#8c532b]/10 border border-[#8c532b]/20 px-3.5 py-1 text-xs font-semibold text-[#8c532b] font-sans">
                <Diamond className="h-3.5 w-3.5" />
                <span>Curated Luxury & Artisanal</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-normal text-stone-900 leading-tight">
                {headline}
              </h1>
              <p className="text-base sm:text-lg text-stone-600 font-sans leading-relaxed">
                {subtext}
              </p>
              <div className="pt-2 font-sans">
                <Link
                  href="/products"
                  className={buttonVariants({
                    size: "lg",
                    className:
                      "gap-2 bg-[#78350f] hover:bg-[#92400e] text-amber-50 font-medium rounded-full px-7 shadow-sm",
                  })}
                >
                  <span>{themeConfig.heroCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Luxury Leather Handbag on Pedestal */}
            <div className="relative h-44 w-44 sm:h-56 sm:w-56 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
                <polygon points="16,80 84,80 76,92 24,92" fill="#ded3c3" />
                <ellipse cx="50" cy="80" rx="26" ry="4" fill="#000000" opacity="0.15" />
                <path
                  d="M38 48 C38 28 62 28 62 48"
                  stroke="#92400e"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M30 48 L70 48 L75 80 C75 82 72 83 70 83 L30 83 C28 83 25 82 25 80 Z"
                  fill="#b45309"
                  stroke="#78350f"
                  strokeWidth="2"
                />
                <rect x="46" y="58" width="8" height="6" rx="1.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
                <line x1="30" y1="52" x2="70" y2="52" stroke="#92400e" strokeDasharray="1.5,1.5" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </section>
      ) : (
        /* MODERN MINIMAL HERO */
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-50 via-slate-50 to-emerald-50/40 border border-slate-200/90 p-8 sm:p-12 lg:p-16 text-slate-900 shadow-xs">
          {bannerUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15"
              style={{ backgroundImage: `url(${bannerUrl})` }}
              aria-hidden="true"
            />
          )}
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Featured Collection</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {headline}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {subtext}
              </p>
              <div className="pt-2">
                <Link
                  href="/products"
                  className={buttonVariants({
                    size: "lg",
                    className:
                      "gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-full px-7 shadow-sm",
                  })}
                >
                  <span>{themeConfig.heroCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Minimalist Ceramic Plant Graphic */}
            <div className="relative h-44 w-44 sm:h-56 sm:w-56 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
                <ellipse cx="50" cy="88" rx="28" ry="5" fill="#000000" opacity="0.08" />
                <path
                  d="M40 58 C36 64 34 76 38 84 C40 88 60 88 62 84 C66 76 64 64 60 58 C58 54 42 54 40 58 Z"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                />
                <path d="M50 56 Q50 36 46 22" stroke="#15803d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M50 48 Q34 38 30 46 Q38 52 49 50" fill="#22c55e" opacity="0.9" />
                <path d="M50 42 Q66 32 70 40 Q62 46 51 44" fill="#16a34a" />
                <path d="M47 30 Q36 20 38 28 Q44 32 48 31" fill="#4ade80" />
                <path d="M48 24 Q56 12 62 18 Q58 26 49 25" fill="#15803d" />
                <circle cx="50" cy="18" r="4" fill="#22c55e" />
              </svg>
            </div>
          </div>
        </section>
      )}

      {/* 2. THEME-SPECIFIC TRUST & FEATURE BADGES STRIP */}
      {isVibrant ? (
        <section className="rounded-2xl border border-emerald-950 bg-[#061e16] p-4 text-emerald-100/90 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-emerald-950 text-xs font-semibold">
            <div className="flex items-center justify-center gap-2 pt-2 sm:pt-0">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span>Lightning Fast Delivery</span>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 sm:pt-0">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>100% Secure Checkout</span>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 sm:pt-0">
              <Headphones className="h-4 w-4 text-emerald-400" />
              <span>24/7 Priority Tech Support</span>
            </div>
          </div>
        </section>
      ) : isBoutique ? (
        <section className="rounded-2xl border border-stone-200/80 bg-[#f9f6f0] p-4 text-stone-800 shadow-2xs font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-stone-200 text-xs font-medium">
            <div className="flex items-center justify-center gap-2 pt-2 sm:pt-0">
              <Diamond className="h-4 w-4 text-[#8c532b]" />
              <span>Artisanal Master Craftsmanship</span>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 sm:pt-0">
              <Truck className="h-4 w-4 text-[#8c532b]" />
              <span>Complimentary Domestic Shipping</span>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 sm:pt-0">
              <RotateCcw className="h-4 w-4 text-[#8c532b]" />
              <span>Hassle-Free 30-Day Returns</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. CATEGORIES SECTION */}
      {categories.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl ${themeConfig.headingFontClass}`}>
              {themeConfig.categoriesTitle}
            </h2>
            <Link
              href="/products"
              className={`text-xs font-semibold hover:underline ${
                isVibrant ? "text-emerald-400" : isBoutique ? "text-[#8c532b]" : "text-emerald-700"
              }`}
            >
              View all →
            </Link>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <Link
              href="/products"
              className={`inline-flex items-center ${themeConfig.borderRadiusClass} border px-4 py-2 text-xs font-medium transition-colors shrink-0 ${
                isVibrant
                  ? "border-emerald-950 bg-[#061e16] text-white hover:bg-emerald-950/60"
                  : isBoutique
                    ? "border-stone-300 bg-white/80 text-stone-800 hover:bg-[#f4eee4]"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              All Categories
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className={`inline-flex items-center ${themeConfig.borderRadiusClass} border px-4 py-2 text-xs font-medium transition-colors shrink-0 ${
                  isVibrant
                    ? "border-emerald-950 bg-[#061e16] text-white hover:bg-emerald-950/60"
                    : isBoutique
                      ? "border-stone-300 bg-white/80 text-stone-800 hover:bg-[#f4eee4]"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. PRODUCTS SECTION */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl ${themeConfig.headingFontClass}`}>
              {themeConfig.sectionTitle}
            </h2>
            <p className="text-xs opacity-70">
              {isVibrant
                ? "Top trending gadgets and electronics with exclusive discounts"
                : isBoutique
                  ? "Handcrafted artisanal pieces curated for elegance"
                  : "Discover our latest apparel, lifestyle, and home goods"}
            </p>
          </div>
          <Link
            href="/products"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: `gap-1 text-xs ${isVibrant ? "text-emerald-400 hover:text-emerald-300" : ""}`,
            })}
          >
            <span>View catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {newArrivals.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-12 text-center ${
            isVibrant ? "border-emerald-950 text-emerald-200/60" : "border-border text-muted-foreground"
          }`}>
            <p className="text-sm">
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
