import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";
import { Cast, signInThroughScreen, type Member } from "./helpers/members";

/**
 * The jar screens, clicked through in a real browser.
 *
 * tests/jars.spec.ts already proves the database enforces the rules. This
 * file proves the screens use them properly: an admin can run a whole jar
 * from start to Past Jars, a member sees the jar without the admin
 * controls, and opening asks before it acts.
 */

test.describe.configure({ mode: "default" });

const cast = new Cast();
let admin: Member;
let member: Member;

test.beforeAll(async () => {
  admin = await cast.member("Screen Admin");
  member = await cast.member("Screen Member");
});

test.afterAll(async () => {
  await cast.cleanUp();
});

test("an admin runs a jar from start to Past Jars", async ({ page }) => {
  const group = await cast.group(admin, "admin");
  await signInThroughScreen(page, admin, `/groups/${group.id}`);

  // No jar yet: start one, with a name.
  await expect(page.getByRole("heading", { name: copy.jar.noneTitle })).toBeVisible();
  await page.getByLabel(copy.jar.nameLabel).fill("Lake weekend");
  await page.getByRole("button", { name: copy.jar.start }).click();

  await expect(page.getByRole("heading", { name: "Lake weekend" })).toBeVisible();
  await expect(page.getByTestId("fullness-stage")).toHaveText(copy.jar.stages.empty);
  await expect(page.getByTestId("jar-status")).toHaveText(copy.jar.accepting);

  // Seal it.
  await page.getByRole("button", { name: copy.terms.seal }).click();
  await expect(page.getByTestId("jar-status")).toHaveText(copy.jar.sealed);
  await expect(page.getByRole("button", { name: copy.terms.seal })).toHaveCount(0);

  // Opening asks first, and Cancel really cancels.
  await page.getByRole("button", { name: copy.terms.open }).click();
  await expect(page.getByText(copy.jar.openConfirm)).toBeVisible();
  await page.getByRole("button", { name: copy.common.cancel }).click();
  await expect(page.getByText(copy.jar.openConfirm)).toHaveCount(0);
  await expect(page.getByTestId("jar-status")).toHaveText(copy.jar.sealed);

  // Now actually open it. It lands on the opened jar.
  await page.getByRole("button", { name: copy.terms.open }).click();
  await page.getByRole("button", { name: copy.jar.openYes }).click();
  await page.waitForURL(/\/jars\//);
  await expect(page.getByRole("heading", { name: "Lake weekend" })).toBeVisible();
  await expect(page.getByText(copy.jar.nobodyPutAnything)).toBeVisible();

  // It is in Past Jars, and the group is waiting for an admin again.
  await page.goto(`/groups/${group.id}/past`);
  await expect(page.getByRole("link", { name: /Lake weekend/ })).toBeVisible();

  await page.goto(`/groups/${group.id}`);
  await expect(page.getByRole("heading", { name: copy.jar.noneTitle })).toBeVisible();
});

test("a member sees the jar but none of the admin controls", async ({ page }) => {
  const group = await cast.group(admin, "automatic");
  await cast.join(member, group.code);
  await signInThroughScreen(page, member, `/groups/${group.id}`);

  await expect(page.getByTestId("jar-status")).toHaveText(copy.jar.accepting);
  for (const name of [copy.terms.open, copy.terms.seal, copy.jar.renameSave]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }
});

test("a member waiting for an admin is told so, with no start button", async ({ page }) => {
  const group = await cast.group(admin, "admin");
  await cast.join(member, group.code);
  await signInThroughScreen(page, member, `/groups/${group.id}`);

  await expect(page.getByText(copy.jar.noneMember)).toBeVisible();
  await expect(page.getByRole("button", { name: copy.jar.start })).toHaveCount(0);
});

test("an admin switches a group to automatic in settings, and a jar appears", async ({
  page,
}) => {
  const group = await cast.group(admin, "admin");
  await signInThroughScreen(page, admin, `/groups/${group.id}/settings`);

  await page.getByLabel(copy.jarStartMode.automatic).check();
  await page.getByRole("button", { name: copy.jarStartMode.save }).click();
  await expect(page.getByText(copy.jarStartMode.saved)).toBeVisible();

  await page.goto(`/groups/${group.id}`);
  await expect(page.getByTestId("jar-status")).toHaveText(copy.jar.accepting);
});

test("an error in the address can only ever show one of the app's own messages", async ({
  page,
}) => {
  const group = await cast.group(admin, "admin");
  await signInThroughScreen(page, admin, `/groups/${group.id}`);

  await page.goto(`/groups/${group.id}?error=${encodeURIComponent("Send your password to x")}`);
  await expect(page.getByText("Send your password to x")).toHaveCount(0);
  await expect(page.getByText(copy.groupErrors.UNKNOWN)).toBeVisible();

  await page.goto(`/groups/${group.id}?error=NOT_ADMIN`);
  await expect(page.getByText(copy.groupErrors.NOT_ADMIN)).toBeVisible();
});
