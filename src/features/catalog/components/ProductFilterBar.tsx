"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Category } from "../types";

interface ProductFilterBarProps {
  categories: Category[];
}

export function ProductFilterBar({ categories }: ProductFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = React.useState(searchParams.get("search") || "");

  const currentStatus = searchParams.get("status") || "all";
  const currentCategory = searchParams.get("categoryId") || "";
  const currentSort = searchParams.get("sort") || "newest";

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("search", searchTerm.trim() || null);
  };

  const clearFilters = () => {
    setSearchTerm("");
    router.push(pathname);
  };

  const hasActiveFilters = !!(
    searchParams.get("search") ||
    (searchParams.get("status") && searchParams.get("status") !== "all") ||
    searchParams.get("categoryId") ||
    (searchParams.get("sort") && searchParams.get("sort") !== "newest")
  );

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by title or SKU..."
            className="pl-9 text-xs h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        {/* Filters and Sorting Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <select
            className="text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={currentStatus}
            onChange={(e) => updateParam("status", e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {/* Category Dropdown */}
          <select
            className="text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[160px]"
            value={currentCategory}
            onChange={(e) => updateParam("categoryId", e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            className="text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={currentSort}
            onChange={(e) => updateParam("sort", e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="stock_asc">Stock: Low to High</option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs h-9 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
