import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";

/**
 * Smoke tests — the "does it switch on?" checks.
 *
 * None of these sign in or write anything to the database. They only confirm
 * the app starts, can reach its database, and keeps signed-out visitors on
 * the right side of the door.
 *
 * The expected words come from copy.ts rather than being typed out here, so
 * rewording a screen during the Design Stage does not break these tests.
 */

test("the health check says the app can reach its database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);

  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.supabase.database).toBe("ok");
});

test("the sign-in screen shows its title and the email box", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(page.getByRole("heading", { name: copy.signIn.title })).toBeVisible();
  await expect(page.getByLabel(copy.signIn.emailLabel)).toBeVisible();
});

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);
});

// Every screen behind the door. A signed-out visitor must bounce off each
// one, and remember where they were heading so signing in takes them there.
for (const path of ["/groups", "/groups/new", "/groups/join", "/settings", "/welcome"]) {
  test(`signed-out visitors cannot reach ${path}`, async ({ page }) => {
    await page.goto(path);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("next")).toBe(path);
  });
}
