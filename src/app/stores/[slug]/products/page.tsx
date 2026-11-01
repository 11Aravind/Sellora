import Link from "next/link";
import { notFound } from "next/navigation";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getStorefrontTenant,
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/features/storefront/queries";
import { ProductCard } from "@/features/storefront/components/ProductCard";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";

export default async function StorefrontProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: "newest" | "price-asc" | "price-desc";
    page?: string;
  }>;
}) {
  const { slug } = await params;
  const { q = "", category = "", sort = "newest", page = "1" } = await searchParams;

  const tenant = await getStorefrontTenant(slug);
  if (!tenant) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 12;

  const [categories, { products, total, totalPages }] = await Promise.all([
    getStorefrontCategories(tenant.id),
    getStorefrontProducts({
      tenantId: tenant.id,
      query: q,
      categorySlug: category,
      sort,
      page: currentPage,
      pageSize,
    }),
  ]);

  // Helper to construct query strings while preserving existing parameters
  const createQueryString = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams();
    if (q) current.set("q", q);
    if (category) current.set("category", category);
    if (sort && sort !== "newest") current.set("sort", sort);
    if (currentPage > 1) current.set("page", String(currentPage));

    for (const [key, val] of Object.entries(newParams)) {
      if (val === null || val === "") {
        current.delete(key);
      } else {
        current.set(key, val);
      }
    }
    const str = current.toString();
    return str ? `?${str}` : "";
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            All Products
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Showing {products.length} of {total} {total === 1 ? "product" : "products"}
          </p>
        </div>

        {/* Search bar & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form method="GET" className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search products..."
              className="pl-9 h-9 text-xs"
            />
            {category && <input type="hidden" name="category" value={category} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
          </form>

          {/* Sort links */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-muted/40 p-1 rounded-lg border border-border/50 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
            <Link
              href={`/products${createQueryString({ sort: null, page: "1" })}`}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                sort === "newest"
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Newest
            </Link>
            <Link
              href={`/products${createQueryString({ sort: "price-asc", page: "1" })}`}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                sort === "price-asc"
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Price: Low
            </Link>
            <Link
              href={`/products${createQueryString({ sort: "price-desc", page: "1" })}`}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                sort === "price-desc"
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Price: High
            </Link>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Link
            href={`/products${createQueryString({ category: null, page: "1" })}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors shrink-0 ${
              !category
                ? "bg-primary text-primary-foreground"
                : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            All Categories
          </Link>
          {categories.map((cat) => {
            const isActive = category === cat.slug;
            return (
              <Link
                key={cat.id}
                href={`/products${createQueryString({ category: cat.slug, page: "1" })}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/80 bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-16 text-center space-y-3">
          <p className="text-base font-medium text-foreground">
            No products found
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {q || category
              ? "Try adjusting your search query or category filter to find what you are looking for."
              : "No active products are available in this store currently."}
          </p>
          {(q || category) && (
            <Link
              href="/products"
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 text-xs" })}
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          {currentPage <= 1 ? (
            <span
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1 text-xs opacity-50 pointer-events-none",
              })}
              aria-disabled="true"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </span>
          ) : (
            <Link
              href={`/products${createQueryString({ page: String(currentPage - 1) })}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1 text-xs",
              })}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Link>
          )}

          <span className="text-xs text-muted-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>

          {currentPage >= totalPages ? (
            <span
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1 text-xs opacity-50 pointer-events-none",
              })}
              aria-disabled="true"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          ) : (
            <Link
              href={`/products${createQueryString({ page: String(currentPage + 1) })}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1 text-xs",
              })}
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
