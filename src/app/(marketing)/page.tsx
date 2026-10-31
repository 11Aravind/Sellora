import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation Bar */}
      <header className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-lg shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              SaaS Commerce
            </span>
          </div>

          <nav className="text-muted-foreground hidden items-center gap-6 text-sm font-medium md:flex">
            <Link
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#docs"
              className="hover:text-foreground transition-colors"
            >
              Documentation
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button size="sm" className="gap-1.5">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="from-background via-muted/20 to-background border-border/50 relative overflow-hidden border-b bg-gradient-to-b py-24 md:py-32">
          <div className="container mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <div className="border-primary/20 bg-primary/5 text-primary animate-in fade-in slide-in-from-top-4 mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold duration-500">
              <Sparkles className="h-3.5 w-3.5" />
              Next-Gen Multi-Tenant E-Commerce
            </div>

            <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Launch your online store{" "}
              <span className="from-primary bg-gradient-to-r via-indigo-500 to-sky-500 bg-clip-text text-transparent">
                in minutes
              </span>
            </h1>

            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg sm:text-xl">
              Everything independent vendors need to sell online. Automated
              tenant subdomains, instant product catalogs, automated plan
              limits, and seamless Indian payment checkout.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/onboarding" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="shadow-primary/20 h-12 w-full gap-2 px-8 text-base shadow-lg sm:w-auto"
                >
                  Create Your Store
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 w-full px-8 text-base sm:w-auto"
                >
                  View Subscription Plans
                </Button>
              </Link>
            </div>

            <div className="text-muted-foreground mt-12 flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>No credit card required upfront</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Custom subdomains included</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="bg-muted/10 py-20">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <Badge variant="outline" className="mb-3">
                Built For Scale
              </Badge>
              <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
                Powerful tools engineered for modern commerce
              </h2>
              <p className="text-muted-foreground mt-4 text-base">
                Built with multi-tenant architecture, robust database limits,
                and high-performance server components.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <Card className="border-border/80 border shadow-sm transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Store className="h-5 w-5" />
                  </div>
                  <CardTitle>Tenant Subdomains</CardTitle>
                  <CardDescription>
                    Every store automatically receives its own isolated URL at
                    your-brand.domain.com with custom domain support.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Next.js middleware seamlessly rewrites requests based on
                    incoming host header, isolating tenant data.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/80 border shadow-sm transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Zap className="h-5 w-5" />
                  </div>
                  <CardTitle>Database-Enforced Limits</CardTitle>
                  <CardDescription>
                    Plan constraints (products, staff, orders) are enforced via
                    PostgreSQL triggers and RPCs for bulletproof integrity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Zero chance of bypassing subscription limits directly from
                    browser API requests.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/80 border shadow-sm transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <CardTitle>Razorpay & Firebase</CardTitle>
                  <CardDescription>
                    Integrated Razorpay recurring subscriptions with automated
                    webhooks and real-time Firebase push alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Instant vendor notifications on order placement and
                    subscription status updates.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-border bg-background border-t py-8">
        <div className="text-muted-foreground container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm sm:flex-row">
          <p>© 2026 SaaS Commerce Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
