import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Store, UserCheck } from "lucide-react";
import { requireUser, getMyTenants } from "@/features/auth/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserNav } from "@/components/shared/UserNav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Stores | SaaS Commerce",
  description: "Select a store to manage your products, orders, and team.",
};

export default async function DashboardStorePickerPage() {
  const user = await requireUser("/dashboard");
  const tenants = await getMyTenants();

  // If user has zero stores, send to onboarding
  if (tenants.length === 0) {
    redirect("/onboarding");
  }

  // If user has exactly 1 store, redirect directly to that store's dashboard
  if (tenants.length === 1) {
    redirect(`/dashboard/${tenants[0].slug}`);
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">SaaS Commerce</span>
          </Link>

          <div className="flex items-center gap-3">
            {tenants.length < 5 && (
              <Link href="/onboarding">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New Store
                </Button>
              </Link>
            )}
            <UserNav
              user={{
                email: user.email,
                fullName: (user.user_metadata?.full_name as string) || null,
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Your Stores
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select an online store to manage its catalog, orders, and settings.
            </p>
          </div>

          {tenants.length < 5 ? (
            <Link href="/onboarding">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Another Store
              </Button>
            </Link>
          ) : (
            <Badge variant="outline" className="text-xs">
              Account limit reached (5/5 stores)
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => {
            const isSuspended = tenant.status === "suspended";

            return (
              <Card
                key={tenant.id}
                className="flex flex-col justify-between border-border/80 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl font-bold truncate">
                      {tenant.name}
                    </CardTitle>
                    <Badge
                      variant={isSuspended ? "destructive" : "secondary"}
                      className="capitalize text-[11px]"
                    >
                      {tenant.status}
                    </Badge>
                  </div>
                  <CardDescription className="font-mono text-xs text-muted-foreground truncate">
                    {tenant.slug}.{rootDomain}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span>Role: </span>
                    <strong className="capitalize text-foreground font-semibold">
                      {tenant.role}
                    </strong>
                  </div>
                </CardContent>

                <CardFooter className="pt-4 border-t border-border/40">
                  <Link
                    href={`/dashboard/${tenant.slug}`}
                    className="w-full"
                  >
                    <Button
                      variant={isSuspended ? "outline" : "default"}
                      className="w-full justify-between"
                      disabled={isSuspended}
                    >
                      <span>{isSuspended ? "Store Suspended" : "Open Dashboard"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © 2026 SaaS Commerce Platform. Multi-tenant store picker.
      </footer>
    </div>
  );
}
