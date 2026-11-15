import * as React from "react";
import Link from "next/link";
import { Store, ArrowLeft, ShieldCheck, Zap, CreditCard, Sparkles, TrendingUp } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-background">
      {/* Left Column: Platform Showcase (Visible on Large Screens) */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-slate-950 via-[#051c14] to-slate-950 text-white overflow-hidden border-r border-border/40 select-none">
        {/* Subtle Ambient Background Mesh & Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Store className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Sellora
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] text-emerald-300/80 font-semibold uppercase tracking-widest">
                Commerce Engine
              </span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Multi-Tenant SaaS 2.0</span>
          </div>
        </div>

        {/* Middle: Value Props & Floating Glass Mockup */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-lg">
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Launch, manage, and scale online stores with full independence.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every merchant gets their own custom storefront, dedicated product catalog, real-time orders dashboard, and independent payment gateway.
            </p>
          </div>

          {/* Floating Metric Card Mockup */}
          <div className="relative rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200">
                  Live Merchant Dashboard
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                Active Store
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 font-medium">Today&apos;s Revenue</div>
                <div className="text-xl font-bold text-white mt-1">₹48,250</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                  <TrendingUp className="h-3 w-3" />
                  +18.4% vs last week
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="text-[11px] text-slate-400 font-medium">Orders Today</div>
                <div className="text-xl font-bold text-white mt-1">32 Orders</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  100% fulfillment rate
                </div>
              </div>
            </div>

            {/* Feature Bullets */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-300 font-medium">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Instant Setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Razorpay OAuth</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Isolated Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Testimonial */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <p className="italic">
            &ldquo;Sellora gives us the simplicity of Shopify with complete multi-store tenant isolation.&rdquo;
          </p>
          <span className="font-semibold text-slate-300 shrink-0 ml-4">— Verified Merchant</span>
        </div>
      </div>

      {/* Right Column: Authentication Form Canvas */}
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-screen relative bg-background/50">
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          {/* Mobile Logo Only */}
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Sellora
            </span>
          </Link>

          {/* Back to Home Link */}
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to website</span>
          </Link>
        </div>

        {/* Center: Auth Form Component */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {children}
        </div>

        {/* Bottom Trust & Legal Footer */}
        <div className="w-full max-w-md mx-auto pt-6 text-center space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>256-bit SSL encrypted • Isolated tenant architecture</span>
          </div>
          <p className="text-[11px] text-muted-foreground/75">
            © 2026 Sellora. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
