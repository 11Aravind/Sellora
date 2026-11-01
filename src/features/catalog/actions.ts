"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/features/auth/queries";
import { parseDbError, friendlyMessage, type ActionResult } from "@/lib/errors";
import {
  categoryFormSchema,
  productFormSchema,
  type CategoryFormInput,
  type ProductFormInput,
} from "./schemas";

/**
 * Validates that the active user is a member of the tenant.
 */
async function verifyCatalogAccess(
  tenantId: string
): Promise<ActionResult<{ userId: string; role: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "AUTH_REQUIRED", message: "You must be signed in." };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const mem = member as unknown as { role: string } | null;
  if (!mem) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not a member of this store team.",
    };
  }

  return { ok: true, data: { userId: user.id, role: mem.role } };
}

// -----------------------------------------------------------------------------
// Category Actions
// -----------------------------------------------------------------------------

export async function createCategoryAction(
  tenantId: string,
  data: CategoryFormInput
): Promise<ActionResult<{ id: string }>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = categoryFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid category data.",
    };
  }

  const supabase = await createClient();

  type CategoryInsert = {
    insert: (vals: Record<string, unknown>) => {
      select: (col: string) => {
        single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
      };
    };
  };

  const { data: newCat, error } = await (
    supabase.from("categories") as unknown as CategoryInsert
  )
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      parent_id: parsed.data.parentId || null,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .single();

  if (error || !newCat) {
    const code = parseDbError(error);
    const message =
      code === "23505"
        ? "A category with this URL slug already exists."
        : friendlyMessage(code);
    return { ok: false, code, message };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: { id: newCat.id } };
}

export async function updateCategoryAction(
  tenantId: string,
  categoryId: string,
  data: CategoryFormInput
): Promise<ActionResult<void>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = categoryFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid category data.",
    };
  }

  // Prevent setting self as parent
  if (parsed.data.parentId === categoryId) {
    return {
      ok: false,
      code: "INVALID_PARENT",
      message: "A category cannot be its own parent.",
    };
  }

  const supabase = await createClient();

  type CategoryUpdate = {
    update: (vals: Record<string, unknown>) => {
      eq: (col1: string, val1: unknown) => {
        eq: (col2: string, val2: unknown) => Promise<{ error: Error | null }>;
      };
    };
  };

  const { error } = await (
    supabase.from("categories") as unknown as CategoryUpdate
  )
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      parent_id: parsed.data.parentId || null,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", categoryId)
    .eq("tenant_id", tenantId);

  if (error) {
    const code = parseDbError(error);
    const message =
      code === "23505"
        ? "A category with this URL slug already exists."
        : friendlyMessage(code);
    return { ok: false, code, message };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}

export async function deleteCategoryAction(
  tenantId: string,
  categoryId: string
): Promise<ActionResult<void>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("tenant_id", tenantId);

  if (error) {
    const code = parseDbError(error);
    return { ok: false, code, message: friendlyMessage(code) };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}

// -----------------------------------------------------------------------------
// Product Actions
// -----------------------------------------------------------------------------

export async function createProductAction(
  tenantId: string,
  data: ProductFormInput
): Promise<ActionResult<{ id: string }>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = productFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid product data.",
    };
  }

  const supabase = await createClient();

  type ProductInsert = {
    insert: (vals: Record<string, unknown>) => {
      select: (col: string) => {
        single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
      };
    };
  };

  // 1. Create product row first to obtain product.id
  const { data: newProd, error: prodErr } = await (
    supabase.from("products") as unknown as ProductInsert
  )
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compare_at_price: parsed.data.compareAtPrice || null,
      sku: parsed.data.sku ? parsed.data.sku.trim() : null,
      stock: parsed.data.stock,
      track_inventory: parsed.data.trackInventory,
      status: parsed.data.status,
      category_id: parsed.data.categoryId || null,
    })
    .select("id")
    .single();

  if (prodErr || !newProd) {
    const code = parseDbError(prodErr);
    let message = friendlyMessage(code);
    if (code === "23505") {
      message = "A product with this URL slug or SKU already exists in your store.";
    }
    return { ok: false, code, message };
  }

  // 2. Insert product images if provided
  if (parsed.data.images && parsed.data.images.length > 0) {
    const imagePayloads = parsed.data.images.map((img, idx) => ({
      tenant_id: tenantId,
      product_id: newProd.id,
      url: img.url,
      alt: img.alt || null,
      position: img.position ?? idx,
    }));

    type ImagesInsert = {
      insert: (vals: unknown[]) => Promise<{ error: Error | null }>;
    };

    await (supabase.from("product_images") as unknown as ImagesInsert).insert(
      imagePayloads
    );
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: { id: newProd.id } };
}

export async function updateProductAction(
  tenantId: string,
  productId: string,
  data: ProductFormInput
): Promise<ActionResult<void>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  const parsed = productFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message || "Invalid product data.",
    };
  }

  const supabase = await createClient();

  type ProductUpdate = {
    update: (vals: Record<string, unknown>) => {
      eq: (col1: string, val1: unknown) => {
        eq: (col2: string, val2: unknown) => Promise<{ error: Error | null }>;
      };
    };
  };

  // 1. Update product table
  const { error: prodErr } = await (
    supabase.from("products") as unknown as ProductUpdate
  )
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      price: parsed.data.price,
      compare_at_price: parsed.data.compareAtPrice || null,
      sku: parsed.data.sku ? parsed.data.sku.trim() : null,
      stock: parsed.data.stock,
      track_inventory: parsed.data.trackInventory,
      status: parsed.data.status,
      category_id: parsed.data.categoryId || null,
    })
    .eq("id", productId)
    .eq("tenant_id", tenantId);

  if (prodErr) {
    const code = parseDbError(prodErr);
    let message = friendlyMessage(code);
    if (code === "23505") {
      message = "A product with this URL slug or SKU already exists in your store.";
    }
    return { ok: false, code, message };
  }

  // 2. Synchronize images
  // Delete existing images and re-insert updated list
  await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId)
    .eq("tenant_id", tenantId);

  if (parsed.data.images && parsed.data.images.length > 0) {
    const imagePayloads = parsed.data.images.map((img, idx) => ({
      tenant_id: tenantId,
      product_id: productId,
      url: img.url,
      alt: img.alt || null,
      position: img.position ?? idx,
    }));

    type ImagesInsert = {
      insert: (vals: unknown[]) => Promise<{ error: Error | null }>;
    };

    await (supabase.from("product_images") as unknown as ImagesInsert).insert(
      imagePayloads
    );
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}

export async function archiveProductAction(
  tenantId: string,
  productId: string
): Promise<ActionResult<void>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();

  type ProductStatusUpdate = {
    update: (vals: Record<string, unknown>) => {
      eq: (col1: string, val1: unknown) => {
        eq: (col2: string, val2: unknown) => Promise<{ error: Error | null }>;
      };
    };
  };

  const { error } = await (
    supabase.from("products") as unknown as ProductStatusUpdate
  )
    .update({ status: "archived" })
    .eq("id", productId)
    .eq("tenant_id", tenantId);

  if (error) {
    const code = parseDbError(error);
    return { ok: false, code, message: friendlyMessage(code) };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}

export async function unarchiveProductAction(
  tenantId: string,
  productId: string
): Promise<ActionResult<void>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();

  type ProductStatusUpdate = {
    update: (vals: Record<string, unknown>) => {
      eq: (col1: string, val1: unknown) => {
        eq: (col2: string, val2: unknown) => Promise<{ error: Error | null }>;
      };
    };
  };

  // Setting status to 'active' triggers products_enforce_limit trigger
  const { error } = await (
    supabase.from("products") as unknown as ProductStatusUpdate
  )
    .update({ status: "active" })
    .eq("id", productId)
    .eq("tenant_id", tenantId);

  if (error) {
    const code = parseDbError(error);
    return { ok: false, code, message: friendlyMessage(code) };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}

export async function bulkArchiveProductsAction(
  tenantId: string,
  productIds: string[]
): Promise<ActionResult<{ archivedCount: number }>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  if (!productIds || productIds.length === 0) {
    return { ok: true, data: { archivedCount: 0 } };
  }

  const supabase = await createClient();

  type ProductInUpdate = {
    update: (vals: Record<string, unknown>) => {
      in: (col1: string, val1: unknown[]) => {
        eq: (col2: string, val2: unknown) => Promise<{ error: Error | null }>;
      };
    };
  };

  const { error } = await (
    supabase.from("products") as unknown as ProductInUpdate
  )
    .update({ status: "archived" })
    .in("id", productIds)
    .eq("tenant_id", tenantId);

  if (error) {
    const code = parseDbError(error);
    return { ok: false, code, message: friendlyMessage(code) };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: { archivedCount: productIds.length } };
}

/**
 * Hard delete: Only allowed if the product has no order_items.
 * Also cleans up storage files and product_images rows.
 */
export async function deleteProductAction(
  tenantId: string,
  productId: string
): Promise<ActionResult<void>> {
  const authCheck = await verifyCatalogAccess(tenantId);
  if (!authCheck.ok) return authCheck;

  const supabase = await createClient();

  // 1. Check if product has any order_items
  const { count: orderItemsCount } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("tenant_id", tenantId);

  if (orderItemsCount && orderItemsCount > 0) {
    return {
      ok: false,
      code: "PRODUCT_HAS_ORDERS",
      message:
        "This product is associated with existing customer orders and cannot be deleted. Please archive it instead.",
    };
  }

  // 2. Fetch images to delete from Supabase storage
  const { data: imagesData } = await supabase
    .from("product_images")
    .select("url")
    .eq("product_id", productId)
    .eq("tenant_id", tenantId);

  const images = imagesData as unknown as Array<{ url: string }> | null;

  if (images && images.length > 0) {
    const admin = createAdminClient();
    const filePaths: string[] = [];

    for (const img of images) {
      try {
        // Extract storage path from url if in product-images bucket
        // Format: .../storage/v1/object/public/product-images/{tenantId}/{productId}/{file}
        const marker = "/product-images/";
        const idx = img.url.indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(img.url.slice(idx + marker.length));
          filePaths.push(path);
        }
      } catch {
        // Ignore URL parsing errors
      }
    }

    if (filePaths.length > 0) {
      await admin.storage.from("product-images").remove(filePaths);
    }
  }

  // 3. Delete product row (cascades to product_images)
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("tenant_id", tenantId);

  if (error) {
    const code = parseDbError(error);
    return { ok: false, code, message: friendlyMessage(code) };
  }

  revalidatePath(`/dashboard`);
  return { ok: true, data: undefined };
}
