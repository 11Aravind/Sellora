import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Store, ShieldAlert } from "lucide-react";
import { getStorefrontTenant } from "@/features/storefront/queries";
import { CartProvider } from "@/features/storefront/context/CartContext";
import { CartBadge } from "@/features/storefront/components/CartBadge";
import { CustomerNav } from "@/features/storefront/components/CustomerNav";
import { Card, CardContent } from "@/components/ui/card";

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

  const primaryColor = (tenant.settings?.primaryColor as string) || "#4f46e5";
  const tagline = (tenant.settings?.tagline as string) || null;

  return (
    <CartProvider tenantId={tenant.id}>
      <div
        className="min-h-screen flex flex-col bg-background text-foreground"
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
        <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Store className="h-4 w-4" />
                  </div>
                )}
                <span>{tenant.name}</span>
              </Link>

              <nav className="hidden md:flex items-center gap-5">
                <Link
                  href="/products"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Products
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/products"
                className="md:hidden text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
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
        <footer className="border-t border-border/50 bg-muted/20 py-10 text-center text-sm text-muted-foreground">
          <div className="container mx-auto px-4 space-y-3">
            <p className="font-semibold text-foreground text-base">
              {tenant.name}
            </p>
            {tagline && (
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {tagline}
              </p>
            )}
            <p className="text-xs text-muted-foreground pt-4">
              © {new Date().getFullYear()} {tenant.name}. All rights reserved. Powered by SaaS Commerce Kit.
            </p>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
