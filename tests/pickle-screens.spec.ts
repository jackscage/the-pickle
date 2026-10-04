import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";
import { Cast, signInThroughScreen, type Member } from "./helpers/members";

/**
 * Put It In The Pickle, and Open The Jar, clicked through in a real browser
 * (build brief tasks 7 and 8). The anonymity guarantees themselves are in
 * tests/anonymity.spec.ts; this file checks the screens work.
 */

test.describe.configure({ mode: "default" });

const cast = new Cast();
let admin: Member;
let writer: Member;

test.beforeAll(async () => {
  admin = await cast.member("Pickle Admin");
  writer = await cast.member("Pickle Writer");
});

test.afterEach(async () => {
  await cast.cleanUpGroups();
});

test.afterAll(async () => {
  await cast.cleanUp();
});

async function groupWithJar() {
  const group = await cast.group(admin, "admin");
  await cast.join(writer, group.code);
  const jarId = await cast.startJar(admin, group.id);
  return { group, jarId };
}

test("write, preview, put it in — and the jar fills", async ({ page }) => {
  const { group } = await groupWithJar();
  await signInThroughScreen(page, writer, `/groups/${group.id}`);
  await expect(page.getByTestId("fullness-stage")).toHaveText(copy.jar.stages.empty);

  await page.getByRole("link", { name: copy.terms.submit }).click();
  await page.getByLabel(copy.pickle.textLabel).fill("Why did the pickle blush?");
  await page.getByRole("button", { name: copy.pickle.preview }).click();

  // The preview shows exactly what was written.
  await expect(page.getByTestId("pickle-preview")).toHaveText("Why did the pickle blush?");

  // Keep editing goes back without losing it.
  await page.getByRole("button", { name: copy.pickle.keepEditing }).click();
  await expect(page.getByLabel(copy.pickle.textLabel)).toHaveValue("Why did the pickle blush?");

  await page.getByRole("button", { name: copy.pickle.preview }).click();
  await page.getByRole("button", { name: copy.pickle.putItIn }).click();

  await page.waitForURL(`**/groups/${group.id}?put=1`);
  await expect(page.getByText(copy.pickle.done)).toBeVisible();
  // Two members, one pickle: that is half a pickle each, which the spec's
  // table calls "half full" ("a few" is anything below half a pickle each).
  await expect(page.getByTestId("fullness-stage")).toHaveText(copy.jar.stages.half);
});

test("an empty or overlong pickle can't be previewed", async ({ page }) => {
  const { group } = await groupWithJar();
  await signInThroughScreen(page, writer, `/groups/${group.id}/put`);

  const preview = page.getByRole("button", { name: copy.pickle.preview });
  await expect(preview).toBeDisabled();

  await page.getByLabel(copy.pickle.textLabel).fill("x".repeat(1201));
  await expect(page.getByText(copy.pickle.tooLongBy(1))).toBeVisible();
  await expect(preview).toBeDisabled();

  await page.getByLabel(copy.pickle.textLabel).fill("x".repeat(1200));
  await expect(page.getByText(copy.pickle.charactersLeft(0))).toBeVisible();
  await expect(preview).toBeEnabled();
});

test("if the jar is sealed mid-sentence, the writing is kept and the reason given", async ({
  page,
}) => {
  const { group, jarId } = await groupWithJar();
  await signInThroughScreen(page, writer, `/groups/${group.id}/put`);

  await page.getByLabel(copy.pickle.textLabel).fill("Something I worked hard on");
  await page.getByRole("button", { name: copy.pickle.preview }).click();

  // Meanwhile, the admin seals the jar.
  await admin.db.rpc("seal_jar", { p_jar_id: jarId });

  await page.getByRole("button", { name: copy.pickle.putItIn }).click();
  await expect(page.getByText(copy.groupErrors.JAR_NOT_ACCEPTING)).toBeVisible();
  await expect(page.getByLabel(copy.pickle.textLabel)).toHaveValue("Something I worked hard on");
});

test("a sealed jar has no submit button, and the writing screen sends you back", async ({
  page,
}) => {
  const { group, jarId } = await groupWithJar();
  await admin.db.rpc("seal_jar", { p_jar_id: jarId });
  await signInThroughScreen(page, writer, `/groups/${group.id}`);

  await expect(page.getByRole("link", { name: copy.terms.submit })).toHaveCount(0);
  await page.goto(`/groups/${group.id}/put`);
  await expect(page).toHaveURL(new RegExp(`/groups/${group.id}$`));
});

test("opening the jar reveals every pickle, as written", async ({ page }) => {
  const { group, jarId } = await groupWithJar();
  await cast.putPickle(writer, jarId, "Line one\nline two");
  await cast.putPickle(admin, jarId, "The admin's pickle");

  await signInThroughScreen(page, admin, `/groups/${group.id}`);
  await page.getByRole("button", { name: copy.terms.open }).click();
  await page.getByRole("button", { name: copy.jar.openYes }).click();
  await page.waitForURL(/\/jars\//);

  const pickles = page.getByTestId("pickle");
  await expect(pickles).toHaveCount(2);
  await expect(page.getByText("The admin's pickle")).toBeVisible();
  await expect(page.getByText(/Line one\s+line two/)).toBeVisible();
  // The admin's own is marked as theirs; the other is anonymous.
  await expect(page.getByText(copy.pickle.youWroteThis)).toHaveCount(1);
  await expect(page.getByText(copy.pickle.anonymous, { exact: true })).toHaveCount(1);
});
