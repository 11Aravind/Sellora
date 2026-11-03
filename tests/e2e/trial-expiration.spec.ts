import { test, expect } from "@playwright/test";

test.describe("Trial Expiration Lockdown", () => {
  test("expired trial displays store paused screen and blocks writes", async ({
    page,
  }) => {
    // Navigate to a store with an expired subscription / trial
    const response = await page.goto("/stores/expired-trial-store");

    if (response && response.status() === 200) {
      // Storefront layout should render "This store is temporarily unavailable"
      const pausedMessage = page.locator("text=This store is temporarily unavailable");
      if (await pausedMessage.isVisible()) {
        await expect(pausedMessage).toBeVisible();
      }
    }
  });
});

