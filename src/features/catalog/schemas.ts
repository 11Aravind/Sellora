import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must only contain lowercase letters, numbers, and single hyphens"),
  parentId: z.string().uuid("Invalid parent category ID").nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const productImageSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url("Valid image URL required"),
  alt: z.string().max(200).nullable().optional(),
  position: z.coerce.number().int().min(0).default(0),
});

export type ProductImageInput = z.infer<typeof productImageSchema>;

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Product name must be at least 2 characters").max(200),
    slug: z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters")
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must only contain lowercase letters, numbers, and single hyphens"),
    description: z.string().trim().max(10000).nullable().optional(),
    price: z.coerce.number().min(0, "Price cannot be negative"),
    compareAtPrice: z.coerce.number().min(0, "Compare price cannot be negative").nullable().optional(),
    sku: z.string().trim().max(100).nullable().optional(),
    stock: z.coerce.number().int().min(0, "Stock cannot be negative").default(0),
    trackInventory: z.boolean().default(true),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    categoryId: z.string().uuid("Invalid category ID").nullable().optional(),
    images: z.array(productImageSchema).max(8, "Maximum 8 images allowed per product").default([]),
  })
  .refine(
    (data) => {
      if (data.compareAtPrice !== null && data.compareAtPrice !== undefined && data.compareAtPrice > 0) {
        return data.compareAtPrice >= data.price;
      }
      return true;
    },
    {
      message: "Compare-at price must be greater than or equal to selling price",
      path: ["compareAtPrice"],
    }
  );

export type ProductFormInput = z.infer<typeof productFormSchema>;
