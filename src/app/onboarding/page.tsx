import Link from "next/link";
import { AlertCircle, Store } from "lucide-react";
import { requireUser, getMyTenants } from "@/features/auth/queries";
import { getActivePlans } from "@/features/plans/queries";
import { OnboardingWizard } from "@/features/tenants/components/OnboardingWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create your store | SaaS Commerce",
  description: "Set up your online store in three simple steps.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  await requireUser("/onboarding");
  const resolvedParams = await searchParams;

  const [plans, myTenants] = await Promise.all([
    getActivePlans(),
    getMyTenants(),
  ]);

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  // Check if tenant limit (5 stores) reached
  if (myTenants.length >= 5) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-muted/20">
        <Card className="max-w-md w-full text-center border-border/80 shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Store limit reached</CardTitle>
            <CardDescription>
              You have reached the maximum allowed limit of 5 stores per account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please manage your existing stores from the dashboard or contact platform support if you require an enterprise multi-store upgrade.
            </p>
            <Link href="/dashboard" className="block">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">SaaS Commerce</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Wizard */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <OnboardingWizard
          plans={plans}
          initialPlanCode={resolvedParams?.plan}
          rootDomain={rootDomain}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © 2026 SaaS Commerce Platform. Safe, isolated multi-tenant architecture.
      </footer>
    </div>
  );
}
