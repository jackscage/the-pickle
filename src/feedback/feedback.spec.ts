import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { FEATURES_OFF_PORT } from "../../playwright.config";
import { adminClient, Cast, signInThroughScreen, type Member } from "../../tests/helpers/members";
import { feedbackCopy as t } from "./copy";

/**
 * The Feedback Module's tests. They live in the module's folder so that
 * deleting the folder deletes them too.
 *
 * Checks: testers can send feedback from any screen with its context filled
 * in automatically; only readers can read the pool; switching the module
 * off hides every part of it; and the module never touches pickles.
 */

test.describe.configure({ mode: "default" });

const FEATURES_OFF_URL = `http://localhost:${FEATURES_OFF_PORT}`;

const cast = new Cast();
let reader: Member;
let tester: Member;

test.beforeAll(async () => {
  reader = await cast.member("Board Reader");
  tester = await cast.member("Feedback Tester");
  // Readers are added by hand in real life (see README.md); here, by the
  // test's all-powerful setup key.
  const { error } = await adminClient().from("feedback_readers").insert({ user_id: reader.id });
  if (error) throw new Error(error.message);
});

test.afterEach(async () => {
  await cast.cleanUpGroups();
});

test.afterAll(async () => {
  // Feedback outlives a deleted account by design, so remove the test's own.
  await adminClient().from("feedback").delete().in("user_id", [reader.id, tester.id]);
  await cast.cleanUp();
});

test("a tester sends feedback from a jar screen, and the context is filled in", async ({ page }) => {
  const group = await cast.group(reader, "admin");
  await cast.join(tester, group.code);
  await reader.db.rpc("start_jar", { p_group_id: group.id, p_name: "Feedback jar" });

  await signInThroughScreen(page, tester, `/groups/${group.id}`);
  await page.getByRole("button", { name: t.button }).click();
  await page.getByLabel(t.kinds.confusion).check();
  await page.getByLabel(t.messageLabel).fill("I couldn't find the seal button.");
  await page.getByRole("button", { name: t.send }).click();
  await expect(page.getByText(t.sent)).toBeVisible();

  const { data } = await adminClient()
    .from("feedback")
    .select("*")
    .eq("user_id", tester.id)
    .single();
  expect(data).toMatchObject({
    kind: "confusion",
    message: "I couldn't find the seal button.",
    reporter_name: "Feedback Tester",
    screen_path: `/groups/${group.id}`,
    screen_name: "A group's jar",
    group_id: group.id,
    group_name: expect.stringContaining("Test group"),
    jar_name: "Feedback jar",
  });
});

test("only readers can open the pool, and it shows each report in plain words", async ({
  browser,
}) => {
  await tester.db.from("feedback").insert({
    user_id: tester.id,
    reporter_name: "Feedback Tester",
    kind: "bug",
    message: "The pool test bug report",
    screen_path: "/settings",
    screen_name: "Profile settings",
  });

  // A tester who is not a reader: the pool does not exist for them.
  const testerContext = await browser.newContext();
  const testerPage = await testerContext.newPage();
  await signInThroughScreen(testerPage, tester, "/groups");
  const refused = await testerPage.goto("/feedback");
  expect(refused?.status()).toBe(404);
  await expect(testerPage.getByRole("link", { name: t.poolLink })).toHaveCount(0);
  await testerContext.close();

  // A reader sees it, with its context, and can filter by type.
  const readerContext = await browser.newContext();
  const page = await readerContext.newPage();
  await signInThroughScreen(page, reader, "/feedback");
  const item = page.getByTestId("feedback-item").filter({ hasText: "The pool test bug report" });
  await expect(item).toBeVisible();
  await expect(item).toContainText("Profile settings");
  await expect(item).toContainText(t.from("Feedback Tester"));

  await page.getByRole("link", { name: t.kindShort.suggestion }).click();
  await expect(page.getByText("The pool test bug report")).toHaveCount(0);
  await page.getByRole("link", { name: t.kindShort.bug }).click();
  await expect(page.getByText("The pool test bug report")).toBeVisible();
  await readerContext.close();
});

test("the database lets testers send only as themselves, and read nothing", async () => {
  const forged = await tester.db.from("feedback").insert({
    user_id: reader.id,
    kind: "bug",
    message: "pretending to be someone else",
    screen_path: "/",
    screen_name: "x",
  });
  expect(forged.error).not.toBeNull();

  const { data } = await tester.db.from("feedback").select("*");
  expect(data ?? []).toHaveLength(0);

  // And nobody can add themselves to the readers list.
  const promote = await tester.db.from("feedback_readers").insert({ user_id: tester.id });
  expect(promote.error).not.toBeNull();
});

test("switched off, every part of it is gone — even for a reader", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: FEATURES_OFF_URL });
  const page = await context.newPage();
  await signInThroughScreen(page, reader, "/groups");

  await expect(page.getByRole("button", { name: t.button })).toHaveCount(0);
  const pool = await page.goto("/feedback");
  expect(pool?.status()).toBe(404);
  await context.close();
});

test("switched on, the button is there — so the test above is not passing by accident", async ({
  page,
}) => {
  await signInThroughScreen(page, tester, "/groups");
  await expect(page.getByRole("button", { name: t.button })).toBeVisible();
});

test("the module never reads or writes pickles or authorship", () => {
  // A plain read of this folder's own source code. If anyone ever wires
  // pickle data into feedback, this fails.
  const folder = __dirname;
  for (const file of readdirSync(folder)) {
    if (file === "feedback.spec.ts") continue;
    const source = readFileSync(join(folder, file), "utf8");
    // Looks for actual database use — reading a pickle table, or calling a
    // pickle function — not for the words, which comments here use to say
    // exactly this.
    expect(source, file).not.toMatch(
      /\.from\(\s*["'](pickles|pickle_authors)["']|\.rpc\(\s*["'](put_pickle|jar_pickle_count|can_read_jar_pickles)["']/,
    );
  }
});

test("the feedback table has nowhere to put a pickle", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const response = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const columns = Object.keys((await response.json()).definitions.feedback.properties);
  for (const column of columns) {
    expect(column).not.toMatch(/pickle|author|text_content/i);
  }
});
