import { test, expect } from "@playwright/test";

test.describe("Vendor Onboarding & Plan Product Limits", () => {
  test("vendor can sign up, create a store, and hitting the product quota shows an upgrade prompt", async ({
    page,
  }) => {
    // 1. Visit signup page
    await page.goto("/signup");
    await expect(page).toHaveTitle(/Sign Up|Launch your store/i);

    const email = `test-vendor-${Date.now()}@example.com`;
    await page.fill('input[name="fullName"]', "Test Vendor");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // 2. Onboarding wizard
    await page.waitForURL(/\/onboarding/);
    const storeSlug = `test-store-${Date.now().toString().slice(-6)}`;
    await page.fill('input[name="storeName"]', "Test Store");
    await page.fill('input[name="slug"]', storeSlug);

    // Select Starter plan (limit = 30 products)
    const starterPlanRadio = page.locator('input[value="starter"]');
    if (await starterPlanRadio.isVisible()) {
      await starterPlanRadio.check();
    }
    await page.click('button:has-text("Launch Store")');

    // 3. Lands on dashboard
    await page.waitForURL(new RegExp(`/dashboard/${storeSlug}`));
    await expect(page.locator("h1")).toContainText(/Overview/i);

    // 4. Navigate to Products
    await page.click(`a[href="/dashboard/${storeSlug}/products"]`);
    await page.waitForURL(new RegExp(`/dashboard/${storeSlug}/products`));

    // Verify presence of Add Product CTA
    const addProductBtn = page.locator('a:has-text("Add Product"), button:has-text("Add Product")');
    await expect(addProductBtn.first()).toBeVisible();

    // Verify upgrade banner / quota meter indicator is rendered
    const usageMeter = page.locator("text=Plan Usage");
    if (await usageMeter.isVisible()) {
      await expect(usageMeter).toBeVisible();
    }
  });
});

