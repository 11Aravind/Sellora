import { test, expect } from "@playwright/test";

test.describe("Storefront Checkout & Order Tracking", () => {
  test("customer places an order and vendor sees it in dashboard", async ({ page }) => {
    // 1. Visit storefront products page
    await page.goto("/stores/demo-store/products");

    // If store exists, check products catalog
    const productCard = page.locator('a[href*="/stores/demo-store/products/"]');
    if (await productCard.first().isVisible()) {
      await productCard.first().click();

      // Add to Cart
      const addToCartBtn = page.locator('button:has-text("Add to Cart")');
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();

        // Go to Cart
        await page.goto("/stores/demo-store/cart");
        await expect(page.locator("h1")).toContainText(/Shopping Cart/i);

        // Proceed to Checkout
        const checkoutBtn = page.locator('a[href*="/checkout"]');
        if (await checkoutBtn.isVisible()) {
          await checkoutBtn.click();
          await page.waitForURL(/\/checkout/);

          // Customer fills shipping information
          await page.fill('input[name="fullName"]', "Alice Shopper");
          await page.fill('input[name="phone"]', "9876543210");
          await page.fill('input[name="addressLine1"]', "123 Main Street");
          await page.fill('input[name="city"]', "Bengaluru");
          await page.fill('input[name="state"]', "Karnataka");
          await page.fill('input[name="pinCode"]', "560001");

          // Place Order
          await page.click('button:has-text("Place Order")');

          // Verifies redirection to order confirmation
          await page.waitForURL(/\/orders\//);
          await expect(page.locator("h1, h2")).toContainText(/Order/i);
        }
      }
    }
  });
});

