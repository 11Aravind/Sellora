import { test, expect } from "@playwright/test";

test.describe("Multi-Tenant Isolation", () => {
  test("Vendor B cannot open Vendor A dashboard URLs or product edit pages", async ({
    page,
  }) => {
    // 1. Vendor B visits login page
    await page.goto("/login");
    await page.fill('input[name="email"]', "vendor-b@example.com");
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // 2. Direct navigation attempt to Vendor A's private dashboard
    const response = await page.goto("/dashboard/vendor-a-store");

    // Must be blocked (404 Not Found or redirected away)
    if (response) {
      expect([404, 302, 307]).toContain(response.status());
    }

    // 3. Direct navigation attempt to Vendor A's product edit page
    const productEditResponse = await page.goto(
      "/dashboard/vendor-a-store/products/00000000-0000-0000-0000-000000000001"
    );

    if (productEditResponse) {
      expect([404, 302, 307]).toContain(productEditResponse.status());
    }
  });
});

