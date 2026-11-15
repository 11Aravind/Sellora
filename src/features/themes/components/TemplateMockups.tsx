import * as React from "react";
import {
  Search,
  ShoppingBag,
  Menu,
  Shirt,
  Sparkles,
  Zap,
  Shield,
  Headphones,
  Smartphone,
  Tablet,
  Watch,
  Diamond,
  Truck,
  RotateCcw,
} from "lucide-react";

interface MockupProps {
  storeName?: string;
}

/**
 * 1. MODERN MINIMAL MOCKUP
 * Clean, whitespace-heavy, lifestyle & apparel aesthetic matching screenshot.
 */
export function ModernMinimalMockup({ storeName }: MockupProps) {
  const brand = storeName?.trim() || "YourStore";

  return (
    <div className="w-full rounded-xl border border-slate-200/90 bg-white text-slate-800 shadow-xs overflow-hidden select-none text-[10px] leading-tight font-sans">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-slate-900 text-[11px]">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-black text-white">
            W
          </div>
          <span className="truncate max-w-[80px]">{brand}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 text-[9px] text-slate-500 font-medium">
          <span className="text-slate-900 font-semibold">Shop</span>
          <span>Categories</span>
          <span>About</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Search className="h-3 w-3 text-slate-500" />
          <ShoppingBag className="h-3 w-3 text-slate-500" />
          <Menu className="h-3 w-3 text-slate-500" />
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-stone-50 via-slate-50 to-emerald-50/30 px-3.5 py-3 flex items-center justify-between border-b border-slate-100">
        <div className="space-y-1.5 max-w-[55%]">
          <h4 className="font-extrabold text-[12px] leading-tight text-slate-900 tracking-tight">
            Minimal Style.<br />Maximum Impact.
          </h4>
          <p className="text-[8px] text-slate-500 line-clamp-2">
            Discover premium products with effortless style.
          </p>
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 text-white text-[7.5px] font-semibold px-2 py-0.5 shadow-2xs">
              Shop Now →
            </span>
          </div>
        </div>

        {/* Minimalist Ceramic Plant Graphic */}
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm">
            {/* Soft shadow */}
            <ellipse cx="50" cy="88" rx="28" ry="5" fill="#000000" opacity="0.08" />
            {/* Ceramic Vase */}
            <path
              d="M40 58 C36 64 34 76 38 84 C40 88 60 88 62 84 C66 76 64 64 60 58 C58 54 42 54 40 58 Z"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />
            {/* Green Stem & Leaves */}
            <path d="M50 56 Q50 36 46 22" stroke="#15803d" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M50 48 Q34 38 30 46 Q38 52 49 50" fill="#22c55e" opacity="0.9" />
            <path d="M50 42 Q66 32 70 40 Q62 46 51 44" fill="#16a34a" />
            <path d="M47 30 Q36 20 38 28 Q44 32 48 31" fill="#4ade80" />
            <path d="M48 24 Q56 12 62 18 Q58 26 49 25" fill="#15803d" />
            <circle cx="50" cy="18" r="4" fill="#22c55e" />
          </svg>
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="px-3 py-2 grid grid-cols-4 gap-1.5 border-b border-slate-100 bg-white">
        {[
          { label: "Men", icon: "👕" },
          { label: "Women", icon: "👗" },
          { label: "Accessories", icon: "👜" },
          { label: "Home", icon: "🏠" },
        ].map((cat, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50/70 py-1 px-0.5 text-center"
          >
            <span className="text-[10px]">{cat.icon}</span>
            <span className="text-[7.5px] font-medium text-slate-700 mt-0.5">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Trending Products Strip */}
      <div className="p-3 bg-white space-y-2">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-bold text-slate-900">Trending Products</span>
          <span className="text-[8px] text-slate-400 font-medium">View All →</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "Jacket", color: "bg-slate-900", icon: <Shirt className="h-4 w-4 text-slate-300" /> },
            { name: "Leather Tote", color: "bg-amber-800", icon: <ShoppingBag className="h-4 w-4 text-amber-200" /> },
            { name: "Headphones", color: "bg-slate-700", icon: <Headphones className="h-4 w-4 text-slate-300" /> },
          ].map((item, idx) => (
            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/60 p-1.5 flex flex-col items-center">
              <div className={`h-10 w-full rounded flex items-center justify-center ${item.color}/10 mb-1`}>
                {item.icon}
              </div>
              <div className="h-1.5 w-10 bg-slate-200 rounded-full mb-0.5" />
              <div className="h-1.5 w-6 bg-slate-300 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 2. VIBRANT RETAIL MOCKUP
 * Dark high-contrast banner, tech gadget aesthetic, neon emerald CTA matching screenshot.
 */
export function VibrantRetailMockup({ storeName }: MockupProps) {
  const brand = storeName?.trim() || "YourStore";

  return (
    <div className="w-full rounded-xl border border-slate-200/90 bg-white text-slate-800 shadow-xs overflow-hidden select-none text-[10px] leading-tight font-sans">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-950/60 bg-[#061e16] text-white">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-[11px]">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-black">
            R
          </div>
          <span className="truncate max-w-[80px]">{brand}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 text-[9px] text-emerald-200/70 font-medium">
          <span className="text-white font-semibold">Shop</span>
          <span>Deals</span>
          <span>About</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-200/70">
          <Search className="h-3 w-3" />
          <ShoppingBag className="h-3 w-3" />
          <Menu className="h-3 w-3" />
        </div>
      </div>

      {/* Hero Section (Deep dark tech gradient with headphones) */}
      <div className="relative bg-gradient-to-r from-[#03150f] via-[#05241b] to-[#041c14] text-white px-3.5 py-3 flex items-center justify-between border-b border-emerald-950">
        <div className="space-y-1.5 max-w-[55%] z-10">
          <h4 className="font-extrabold text-[12px] leading-tight text-white tracking-tight">
            Next-Gen<br />Tech. Better Life.
          </h4>
          <p className="text-[8px] text-emerald-100/70 line-clamp-2">
            Upgrade your tech with the latest innovations.
          </p>
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 text-slate-950 text-[7.5px] font-bold px-2 py-0.5 shadow-sm">
              Explore More →
            </span>
          </div>
        </div>

        {/* Headphones Graphic */}
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
            {/* Glow */}
            <circle cx="50" cy="50" r="32" fill="#10b981" opacity="0.15" />
            {/* Headband */}
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
            {/* Left Ear Cushion */}
            <rect x="20" y="52" width="12" height="24" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="23" y="56" width="6" height="16" rx="3" fill="#0f172a" />
            {/* Right Ear Cushion */}
            <rect x="68" y="52" width="12" height="24" rx="6" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <rect x="71" y="56" width="6" height="16" rx="3" fill="#0f172a" />
            {/* Accent light ring */}
            <circle cx="26" cy="64" r="2.5" fill="#10b981" />
            <circle cx="74" cy="64" r="2.5" fill="#10b981" />
          </svg>
        </div>
      </div>

      {/* Trust Badges Strip */}
      <div className="px-3 py-1.5 grid grid-cols-3 gap-1 border-b border-slate-100 bg-slate-50/90 text-slate-700 text-[7.5px] font-semibold text-center">
        <div className="flex items-center justify-center gap-1">
          <Zap className="h-2.5 w-2.5 text-emerald-600" />
          <span>Fast Delivery</span>
        </div>
        <div className="flex items-center justify-center gap-1 border-x border-slate-200 px-1">
          <Shield className="h-2.5 w-2.5 text-emerald-600" />
          <span>Secure Payment</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <Headphones className="h-2.5 w-2.5 text-emerald-600" />
          <span>24/7 Support</span>
        </div>
      </div>

      {/* Popular Categories Strip */}
      <div className="p-3 bg-white space-y-2">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-bold text-slate-900">Popular Categories</span>
          <span className="text-[8px] text-slate-400 font-medium">View All →</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { icon: <Smartphone className="h-4 w-4 text-blue-600" />, label: "Phones" },
            { icon: <Tablet className="h-4 w-4 text-indigo-600" />, label: "Tablets" },
            { icon: <Headphones className="h-4 w-4 text-emerald-600" />, label: "Audio" },
            { icon: <Watch className="h-4 w-4 text-amber-600" />, label: "Watches" },
          ].map((item, idx) => (
            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/70 p-1.5 flex flex-col items-center">
              <div className="h-8 w-full rounded bg-white shadow-2xs border border-slate-100 flex items-center justify-center mb-1">
                {item.icon}
              </div>
              <span className="text-[7.5px] font-medium text-slate-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 3. CLASSIC BOUTIQUE MOCKUP
 * Warm neutral linen/ivory aesthetic, timeless serif typography, luxury leather bag matching screenshot.
 */
export function ClassicBoutiqueMockup({ storeName }: MockupProps) {
  const brand = storeName?.trim() || "YourStore";

  return (
    <div className="w-full rounded-xl border border-stone-200/90 bg-[#faf7f2] text-stone-800 shadow-xs overflow-hidden select-none text-[10px] leading-tight font-serif">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200/70 bg-[#faf7f2]">
        <div className="flex items-center gap-1.5 font-bold tracking-normal text-stone-900 text-[11px]">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8c532b] text-[8px] font-bold text-amber-50">
            B
          </div>
          <span className="truncate max-w-[80px] font-serif">{brand}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 text-[9px] text-stone-600 font-sans">
          <span className="text-stone-900 font-semibold">Shop</span>
          <span>About</span>
          <span>Journal</span>
        </div>
        <div className="flex items-center gap-2 text-stone-500">
          <Search className="h-3 w-3" />
          <ShoppingBag className="h-3 w-3" />
          <Menu className="h-3 w-3" />
        </div>
      </div>

      {/* Hero Section (Warm linen with luxury leather bag on pedestal) */}
      <div className="relative bg-[#f4eee4] px-3.5 py-3 flex items-center justify-between border-b border-stone-200/80">
        <div className="space-y-1.5 max-w-[55%]">
          <h4 className="font-semibold text-[12px] leading-tight text-stone-900 font-serif">
            Timeless Style.<br />Lasting Quality.
          </h4>
          <p className="text-[8px] text-stone-600 font-sans line-clamp-2">
            Discover our curated collection of premium products.
          </p>
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#78350f] text-amber-50 font-sans text-[7.5px] font-semibold px-2 py-0.5 shadow-2xs">
              Explore Collection →
            </span>
          </div>
        </div>

        {/* Luxury Handbag Graphic on Pedestal */}
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm">
            {/* Pedestal Block */}
            <polygon points="20,80 80,80 72,90 28,90" fill="#e7ded0" />
            <rect x="28" y="85" width="44" height="6" fill="#ded3c3" />
            {/* Handbag shadow */}
            <ellipse cx="50" cy="80" rx="22" ry="3" fill="#000000" opacity="0.12" />
            {/* Handbag Handles */}
            <path
              d="M40 50 C40 32 60 32 60 50"
              stroke="#92400e"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Handbag Body */}
            <path
              d="M34 50 L66 50 L70 78 C70 80 68 81 66 81 L34 81 C32 81 30 80 30 78 Z"
              fill="#b45309"
              stroke="#78350f"
              strokeWidth="1.5"
            />
            {/* Gold Clasp & Stitching */}
            <rect x="47" y="58" width="6" height="5" rx="1" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
            <line x1="33" y1="53" x2="67" y2="53" stroke="#92400e" strokeDasharray="1,1" strokeWidth="0.8" />
          </svg>
        </div>
      </div>

      {/* Feature Badges Strip */}
      <div className="px-3 py-1.5 grid grid-cols-3 gap-1 border-b border-stone-200/70 bg-[#f9f6f0] text-stone-700 text-[7.5px] font-sans font-medium text-center">
        <div className="flex items-center justify-center gap-1">
          <Diamond className="h-2.5 w-2.5 text-[#8c532b]" />
          <span>Premium Quality</span>
        </div>
        <div className="flex items-center justify-center gap-1 border-x border-stone-200 px-1">
          <Truck className="h-2.5 w-2.5 text-[#8c532b]" />
          <span>Free Shipping</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <RotateCcw className="h-2.5 w-2.5 text-[#8c532b]" />
          <span>Easy Returns</span>
        </div>
      </div>

      {/* Our Collection Strip */}
      <div className="p-3 bg-[#faf7f2] space-y-2">
        <div className="flex items-center justify-between text-[9px]">
          <span className="font-semibold text-stone-900 font-serif">Our Collection</span>
          <span className="text-[8px] text-stone-500 font-sans">View All →</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Linen Shirt", icon: <Shirt className="h-4 w-4 text-[#8c532b]" /> },
            { label: "Classic Watch", icon: <Watch className="h-4 w-4 text-[#8c532b]" /> },
            { label: "Leather Shoes", icon: <Sparkles className="h-4 w-4 text-[#8c532b]" /> },
          ].map((item, idx) => (
            <div key={idx} className="rounded-lg border border-stone-200/80 bg-white/80 p-1.5 flex flex-col items-center">
              <div className="h-10 w-full rounded bg-[#f4eee4] flex items-center justify-center mb-1">
                {item.icon}
              </div>
              <div className="h-1.5 w-10 bg-stone-200 rounded-full mb-0.5" />
              <div className="h-1.5 w-6 bg-stone-300 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

