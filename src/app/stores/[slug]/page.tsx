import * as React from "react";
import { notFound } from "next/navigation";
import { getStorefrontTenant } from "@/features/storefront/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Sparkles } from "lucide-react";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = (await params) as { slug?: string };
  const slug = resolvedParams?.slug || "";
  const tenant = await getStorefrontTenant(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      <Card className="border-border/80 shadow-sm overflow-hidden bg-gradient-to-br from-card via-card to-muted/20">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 text-xs font-semibold">
              <Sparkles className="h-3 w-3 text-primary" />
              Storefront Preview
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {tenant.slug}
            </Badge>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight">
            Welcome to {tenant.name}
          </CardTitle>
          <CardDescription className="text-base">
            This is the official online store for {tenant.name}. The complete product catalog and storefront experience will be active soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-background/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground text-lg mb-1">
              Storefront Under Construction
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Vendor products, category browsing, and shopping cart are coming in the storefront update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
