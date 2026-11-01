import { NextResponse } from "next/server";
import {
  getStorefrontTenant,
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/features/storefront/queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await getStorefrontTenant(slug);
  if (!tenant) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const host = request.headers.get("host") || `${slug}.localhost:3000`;
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const [categories, { products }] = await Promise.all([
    getStorefrontCategories(tenant.id),
    getStorefrontProducts({ tenantId: tenant.id, limit: 200 }),
  ]);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${categories
  .map(
    (c) => `  <url>
    <loc>${baseUrl}/products?category=${encodeURIComponent(c.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
  )
  .join("\n")}
${products
  .map(
    (p) => `  <url>
    <loc>${baseUrl}/products/${p.slug}</loc>
    <lastmod>${new Date(p.updated_at || p.created_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

