export type StoreThemeId = "modern-minimal" | "vibrant-retail" | "classic-boutique";

export interface ThemeConfig {
  id: StoreThemeId;
  name: string;
  tagline: string;
  description: string;
  categoryTag: string;
  recommendedColor: string;
  fontClass: string;
  headingFontClass: string;
  borderRadiusClass: string;
  previewBg: string;
  previewAccent: string;
  previewBadge: string;
  badges: string[];
  features: string[];
  heroHeadline: string;
  heroSubtext: string;
  heroCta: string;
  sectionTitle: string;
  categoriesTitle: string;
}
