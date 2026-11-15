import type { StoreThemeId, ThemeConfig } from "./types";

export const STORE_THEMES: Record<StoreThemeId, ThemeConfig> = {
  "modern-minimal": {
    id: "modern-minimal",
    name: "Modern Minimal",
    tagline: "Clean, elegant, and typography-focused",
    description: "Generous whitespace, sleek borders, and subtle contrast. Ideal for apparel, lifestyle brands, and curated designer products.",
    categoryTag: "Lifestyle & Fashion",
    recommendedColor: "#059669",
    fontClass: "font-sans",
    headingFontClass: "font-sans tracking-tight font-extrabold",
    borderRadiusClass: "rounded-xl",
    previewBg: "from-stone-50 via-slate-50 to-emerald-50/30",
    previewAccent: "#059669",
    previewBadge: "bg-emerald-700 text-white",
    badges: ["Minimalist", "High Whitespace", "Editorial"],
    features: [
      "Ultra-clean product grid with subtle borders",
      "Streamlined typography hierarchy",
      "Understated modern buttons and badges",
    ],
    heroHeadline: "Minimal Style. Maximum Impact.",
    heroSubtext: "Discover premium products with effortless style.",
    heroCta: "Shop Now →",
    sectionTitle: "Trending Products",
    categoriesTitle: "Shop by Category",
  },
  "vibrant-retail": {
    id: "vibrant-retail",
    name: "Vibrant Retail",
    tagline: "Bold, punchy, and high-conversion",
    description: "High-contrast banners, eye-catching sale badges, and rounded dynamic cards. Tailored for electronics, gadgets, and fast-moving retail.",
    categoryTag: "Electronics & Retail",
    recommendedColor: "#10b981",
    fontClass: "font-sans",
    headingFontClass: "font-sans tracking-tight font-black",
    borderRadiusClass: "rounded-2xl",
    previewBg: "from-[#03150f] via-[#05241b] to-[#041c14]",
    previewAccent: "#10b981",
    previewBadge: "bg-emerald-400 text-slate-950",
    badges: ["High-Energy", "Conversion-Focused", "Punchy Badges"],
    features: [
      "High-contrast callouts & prominent discount badges",
      "Playful rounded product cards and hover lifts",
      "Dynamic promo banners and action-oriented buttons",
    ],
    heroHeadline: "Next-Gen Tech. Better Life.",
    heroSubtext: "Upgrade your tech with the latest innovations.",
    heroCta: "Explore More →",
    sectionTitle: "Popular Categories",
    categoriesTitle: "Shop by Category",
  },
  "classic-boutique": {
    id: "classic-boutique",
    name: "Classic Boutique",
    tagline: "Warm, artisanal, and sophisticated",
    description: "Refined serif typography, warm earth tones, and timeless framed presentation. Perfect for jewelry, luxury goods, handicrafts, and bakeries.",
    categoryTag: "Luxury & Artisanal",
    recommendedColor: "#78350f",
    fontClass: "font-serif",
    headingFontClass: "font-serif font-semibold tracking-normal",
    borderRadiusClass: "rounded-lg",
    previewBg: "from-[#faf7f2] via-[#f4eee4] to-[#f9f6f0]",
    previewAccent: "#78350f",
    previewBadge: "bg-[#78350f] text-amber-50",
    badges: ["Timeless Serif", "Artisanal Feel", "Warm Tones"],
    features: [
      "Distinguished serif typography for titles & brand mark",
      "Warm neutral palette with refined card framing",
      "Sophisticated boutique aesthetic for premium items",
    ],
    heroHeadline: "Timeless Style. Lasting Quality.",
    heroSubtext: "Discover our curated collection of premium products.",
    heroCta: "Explore Collection →",
    sectionTitle: "Our Collection",
    categoriesTitle: "Curated Categories",
  },
};

export const DEFAULT_THEME: StoreThemeId = "modern-minimal";

export const THEME_LIST: ThemeConfig[] = Object.values(STORE_THEMES);

export function getThemeConfig(themeId?: string | null): ThemeConfig {
  if (themeId && themeId in STORE_THEMES) {
    return STORE_THEMES[themeId as StoreThemeId];
  }
  return STORE_THEMES[DEFAULT_THEME];
}
