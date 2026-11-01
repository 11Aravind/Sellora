"use client";

import * as React from "react";
import { Plus, FolderTree, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { CategoryDialog } from "./CategoryDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";
import type { Category } from "../types";

interface CategoryListProps {
  tenantId: string;
  categories: Category[];
}

export function CategoryList({ tenantId, categories }: CategoryListProps) {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null);

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Total Categories: <span className="font-semibold text-foreground">{categories.length}</span>
        </div>
        <Button
          size="sm"
          className="text-xs font-semibold gap-1.5"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card className="border-border/80">
          <CardContent className="py-12">
            <EmptyState
              icon={<FolderTree className="h-8 w-8 text-muted-foreground" />}
              title="No categories found"
              description="Group your products into logical collections like Apparel, Accessories, or Summer Deals."
              action={
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  Create First Category
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">URL Slug</th>
                  <th className="px-4 py-3">Parent Collection</th>
                  <th className="px-4 py-3 text-center">Sort Order</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                      <FolderTree className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{c.name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">
                      /{c.slug}
                    </td>
                    <td className="px-4 py-3">
                      {c.parent ? (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {c.parent.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground font-mono">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                      {c.sort_order}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingCategory(c)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
                          onClick={() => setDeletingCategory(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border/60">
            {categories.map((c) => (
              <div key={c.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <FolderTree className="h-3.5 w-3.5 text-primary" />
                    <span>{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingCategory(c)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => setDeletingCategory(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">/{c.slug}</span>
                  {c.parent && (
                    <Badge variant="outline" className="text-[10px]">
                      Parent: {c.parent.name}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Dialog */}
      <CategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        tenantId={tenantId}
        allCategories={categories}
      />

      {/* Edit Dialog */}
      <CategoryDialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        tenantId={tenantId}
        category={editingCategory}
        allCategories={categories}
      />

      {/* Delete Dialog */}
      <DeleteCategoryDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        tenantId={tenantId}
        category={deletingCategory}
      />
    </div>
  );
}
