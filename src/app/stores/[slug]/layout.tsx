import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getStorefrontTenant } from "@/features/storefront/queries";
import { CartProvider } from "@/features/storefront/context/CartContext";
import { CartBadge } from "@/features/storefront/components/CartBadge";
import { CustomerNav } from "@/features/storefront/components/CustomerNav";
import { Card, CardContent } from "@/components/ui/card";
import { getThemeConfig } from "@/features/themes/templates";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = (await params) as { slug?: string };
  const slug = resolvedParams?.slug || "";
  const tenant = await getStorefrontTenant(slug);

  if (!tenant) {
    notFound();
  }

  // If the store is inactive, suspended, or its subscription/trial has expired
  if (!tenant.is_open) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-border/80 shadow-md">
          <CardContent className="pt-8 pb-8 px-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {tenant.name}
              </h1>
              <h2 className="text-lg font-semibold text-muted-foreground">
                This store is temporarily unavailable
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The store is currently paused or undergoing maintenance. Please check back soon or contact the store owner.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const themeConfig = getThemeConfig(tenant.settings?.theme as string);
  const primaryColor = (tenant.settings?.primaryColor as string) || themeConfig.recommendedColor;
  const tagline = (tenant.settings?.tagline as string) || null;

  // Theme-specific styles
  const isVibrant = themeConfig.id === "vibrant-retail";
  const isBoutique = themeConfig.id === "classic-boutique";

  const rootBg = isVibrant
    ? "bg-[#04130d] text-slate-100"
    : isBoutique
      ? "bg-[#faf7f2] text-stone-900"
      : "bg-white text-slate-900";

  const headerBg = isVibrant
    ? "bg-[#061e16] border-emerald-950 text-white"
    : isBoutique
      ? "bg-[#faf7f2] border-stone-200/80 text-stone-900"
      : "bg-white border-slate-100 text-slate-900";

  const navText = isVibrant
    ? "text-emerald-200/70 hover:text-white"
    : isBoutique
      ? "text-stone-600 hover:text-stone-900 font-sans"
      : "text-slate-500 hover:text-slate-900";

  const logoBg = isVibrant
    ? "bg-emerald-400 text-slate-950 font-black"
    : isBoutique
      ? "bg-[#8c532b] text-amber-50"
      : "bg-emerald-600 text-white font-bold";

  const footerBg = isVibrant
    ? "border-emerald-950 bg-[#03130d] text-emerald-200/60"
    : isBoutique
      ? "border-stone-200 bg-[#f4eee4] text-stone-600"
      : "border-slate-100 bg-slate-50 text-slate-500";

  return (
    <CartProvider tenantId={tenant.id}>
      <div
        data-store-theme={themeConfig.id}
        className={`min-h-screen flex flex-col ${rootBg} ${themeConfig.fontClass} transition-colors`}
        style={
          {
            "--store-primary": primaryColor,
          } as React.CSSProperties
        }
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${primaryColor};
            }
          `
        }} />

        {/* Storefront Header */}
        <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-md ${headerBg}`}>
          <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-90 transition-opacity"
              >
                {tenant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tenant.logo_url}
                    alt={tenant.name}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${logoBg}`}>
                    {tenant.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className={themeConfig.headingFontClass}>{tenant.name}</span>
              </Link>

              <nav className="hidden md:flex items-center gap-5">
                <Link
                  href="/products"
                  className={`text-sm font-medium transition-colors ${navText}`}
                >
                  {isVibrant ? "Deals & Products" : isBoutique ? "The Collection" : "All Products"}
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/products"
                className={`md:hidden text-sm font-medium transition-colors px-2 py-1 ${navText}`}
              >
                Catalog
              </Link>
              <CustomerNav />
              <CartBadge />
            </div>
          </div>
        </header>

        {/* Storefront Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Storefront Footer */}
        <footer className={`border-t py-12 text-center text-sm ${footerBg}`}>
          <div className="container mx-auto px-4 space-y-3">
            <p className={`font-semibold text-base ${isVibrant ? "text-white" : isBoutique ? "text-stone-900 font-serif" : "text-slate-900"}`}>
              {tenant.name}
            </p>
            {tagline && (
              <p className="text-xs sm:text-sm max-w-md mx-auto opacity-80">
                {tagline}
              </p>
            )}
            <p className="text-xs opacity-60 pt-4">
              © {new Date().getFullYear()} {tenant.name}. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
