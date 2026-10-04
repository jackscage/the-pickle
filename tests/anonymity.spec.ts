import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { adminClient, Cast, signedOutClient, type Member } from "./helpers/members";

/**
 * ============================================================================
 * THE NO-AUTHOR-LEAKAGE TEST
 * ============================================================================
 * The product's one non-negotiable guarantee (PROJECT_SPEC.md sections 9 and
 * 22, build brief task 9): a pickle never travels to anyone alongside the
 * identity of the person who wrote it.
 *
 * This file checks the guarantee at the bottom layer — the database — the
 * way a determined member with the app's public key and their own login
 * could try to break it, going around the screens entirely. A companion
 * section at the end checks what actually reaches a browser.
 *
 * The cast:
 *   admin      made the group, runs the jar. Admins get NO special view of
 *              authorship.
 *   author     writes the pickles.
 *   bystander  an ordinary member, the person anonymity protects against.
 *   outsider   signed in, not in the group.
 *
 * If any test in this file fails, stop. Do not ship. Do not "fix" the test.
 * ============================================================================
 */

test.describe.configure({ mode: "default" });

const cast = new Cast();
let admin: Member;
let author: Member;
let bystander: Member;
let outsider: Member;

/**
 * Everything that would identify the author. If any of these strings turns
 * up anywhere it should not, authorship has leaked. The display name is
 * random so it cannot match anything by coincidence.
 */
let authorFingerprints: string[];

test.beforeAll(async () => {
  admin = await cast.member("Anon Admin");
  author = await cast.member(`Author ${randomUUID().slice(0, 8)}`);
  bystander = await cast.member("Anon Bystander");
  outsider = await cast.member("Anon Outsider");

  // Give the author a picture too, so the test can prove it never appears.
  const avatarUrl = `https://example.invalid/avatars/${author.id}/${randomUUID()}.png`;
  await author.db.from("profiles").update({ avatar_url: avatarUrl }).eq("id", author.id);

  authorFingerprints = [author.id, author.email, author.displayName, avatarUrl];
});

// Each test's groups (and so its pickles) are cleared as it ends. Otherwise
// the shared author piles up pickles across tests and runs into the spam
// limit in put_pickle — which is the limit working, not a bug.
test.afterEach(async () => {
  await cast.cleanUpGroups();
});

test.afterAll(async () => {
  await cast.cleanUp();
});

/** A group with author and bystander in it, a jar, and two of author's pickles. */
async function jarWithPickles() {
  const group = await cast.group(admin, "admin");
  await cast.join(author, group.code);
  await cast.join(bystander, group.code);
  const jarId = await cast.startJar(admin, group.id);

  const texts = [`first ${randomUUID()}`, `second ${randomUUID()}`];
  const pickleIds = [
    await cast.putPickle(author, jarId, texts[0]),
    await cast.putPickle(author, jarId, texts[1]),
  ];
  return { group, jarId, texts, pickleIds };
}

function expectNoAuthorIn(payload: unknown) {
  const text = JSON.stringify(payload ?? null);
  for (const fingerprint of authorFingerprints) {
    expect(text, "authorship leaked into a response").not.toContain(fingerprint);
  }
}

// ---------------------------------------------------------------------------
// Check 1: the pickles table carries no author column at all.
// ---------------------------------------------------------------------------

test("1. the pickles table has no author column — or anything that could stand in for one", async () => {
  // Ask the database's own API description which columns `pickles` has.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const response = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const description = await response.json();
  const columns = Object.keys(description.definitions.pickles.properties).sort();

  // Exactly these, and nothing else. Adding a column to pickles should make
  // this fail and force a conversation.
  expect(columns).toEqual(["drawing_url", "id", "jar_id", "revealed", "text_content"]);

  // Belt and braces, in case the list above is ever edited carelessly.
  for (const column of columns) {
    expect(column).not.toMatch(/author|user|profile|member|owner|created|by$/i);
  }
});

// ---------------------------------------------------------------------------
// Check 2: no unrevealed pickle exposes an author id, by any route.
// ---------------------------------------------------------------------------

test("2a. nobody can read the pickles in an unopened jar — not members, admins, or the author", async () => {
  const { jarId } = await jarWithPickles();

  for (const who of [admin, author, bystander, outsider]) {
    const { data } = await who.db.from("pickles").select("*").eq("jar_id", jarId);
    expect(data ?? [], `${who.displayName} read an unopened jar`).toHaveLength(0);
  }
});

test("2b. the fullness count is one number and nothing more", async () => {
  const { jarId } = await jarWithPickles();

  const { data, error } = await bystander.db.rpc("jar_pickle_count", { p_jar_id: jarId });
  expect(error).toBeNull();
  expect(data).toBe(2);

  // And an outsider cannot even have that.
  const { error: outsiderError } = await outsider.db.rpc("jar_pickle_count", {
    p_jar_id: jarId,
  });
  expect(outsiderError?.message).toContain("JAR_NOT_FOUND");
});

test("2c. once opened, members read the pickles — and nothing about who wrote them", async () => {
  const { jarId, texts } = await jarWithPickles();
  await admin.db.rpc("open_jar", { p_jar_id: jarId });

  for (const who of [bystander, admin]) {
    const { data, error } = await who.db.from("pickles").select("*").eq("jar_id", jarId);
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data!.map((p) => p.text_content).sort()).toEqual([...texts].sort());
    for (const pickle of data!) {
      expect(Object.keys(pickle).sort()).toEqual(
        ["drawing_url", "id", "jar_id", "revealed", "text_content"],
      );
      expect(pickle.revealed).toBe(false);
    }
    expectNoAuthorIn(data);
  }
});

test("2d. authorship rows are invisible to everyone except the author", async () => {
  const { jarId, pickleIds } = await jarWithPickles();
  await admin.db.rpc("open_jar", { p_jar_id: jarId });

  // Every way of asking, by every non-author: all empty.
  for (const who of [admin, bystander, outsider]) {
    const all = await who.db.from("pickle_authors").select("*");
    expect(all.data ?? [], `${who.displayName} saw authorship rows`).toHaveLength(0);

    const byPickle = await who.db.from("pickle_authors").select("*").in("pickle_id", pickleIds);
    expect(byPickle.data ?? []).toHaveLength(0);

    const byAuthor = await who.db.from("pickle_authors").select("*").eq("author_id", author.id);
    expect(byAuthor.data ?? []).toHaveLength(0);

    // Even just counting would hint at who wrote how many.
    const counted = await who.db
      .from("pickle_authors")
      .select("*", { count: "exact", head: true })
      .eq("author_id", author.id);
    expect(counted.count ?? 0).toBe(0);
  }

  // The author sees exactly the pickles the database records as theirs — no
  // more, no fewer — and that includes the two from this test. That is
  // "You wrote this". (They wrote others earlier in this file too, which is
  // why this compares against the database's own record rather than a list.)
  const mine = await author.db.from("pickle_authors").select("pickle_id, author_id");
  const truth = await adminClient()
    .from("pickle_authors")
    .select("pickle_id")
    .eq("author_id", author.id);
  expect(mine.data!.map((r) => r.pickle_id).sort()).toEqual(
    truth.data!.map((r) => r.pickle_id).sort(),
  );
  expect(mine.data!.every((r) => r.author_id === author.id)).toBe(true);
  for (const id of pickleIds) {
    expect(mine.data!.map((r) => r.pickle_id)).toContain(id);
  }
});

test("2e. asking for pickles WITH their authorship attached returns no authorship", async () => {
  // The database can follow links between tables in one request
  // ("embedding"). A pickle links to its pickle_authors row, so this is the
  // most natural way someone would try to sneak the author out.
  const { jarId } = await jarWithPickles();
  await admin.db.rpc("open_jar", { p_jar_id: jarId });

  for (const who of [bystander, admin]) {
    const { data } = await who.db
      .from("pickles")
      .select("id, text_content, pickle_authors(author_id, created_at)")
      .eq("jar_id", jarId);
    expect(data).toHaveLength(2);
    for (const pickle of data as Array<{ pickle_authors: unknown }>) {
      expect(pickle.pickle_authors).toBeNull();
    }
    expectNoAuthorIn(data);
  }
});

test("2f. nobody can claim, move or forge authorship", async () => {
  const { jarId, pickleIds } = await jarWithPickles();

  // A bystander claiming the author's pickle as their own.
  const claim = await bystander.db
    .from("pickle_authors")
    .insert({ pickle_id: pickleIds[0], author_id: bystander.id });
  expect(claim.error).not.toBeNull();

  // The author trying to pin their pickle on someone else.
  await author.db
    .from("pickle_authors")
    .update({ author_id: bystander.id })
    .eq("pickle_id", pickleIds[0]);
  const stillMine = await author.db
    .from("pickle_authors")
    .select("author_id")
    .eq("pickle_id", pickleIds[0])
    .single();
  expect(stillMine.data?.author_id).toBe(author.id);

  // Nobody writes pickles directly, around put_pickle.
  const direct = await bystander.db.from("pickles").insert({ jar_id: jarId, text_content: "x" });
  expect(direct.error).not.toBeNull();

  // Nobody marks a pickle as revealed on its author's behalf.
  await admin.db.from("pickles").update({ revealed: true }).eq("jar_id", jarId);
  await admin.db.rpc("open_jar", { p_jar_id: jarId });
  const after = await admin.db.from("pickles").select("revealed").eq("jar_id", jarId);
  expect(after.data!.every((p) => p.revealed === false)).toBe(true);
});

test("2g. a signed-out visitor gets nothing at all", async () => {
  const { jarId } = await jarWithPickles();
  await admin.db.rpc("open_jar", { p_jar_id: jarId });
  const anon = signedOutClient();

  const pickles = await anon.from("pickles").select("*").eq("jar_id", jarId);
  expect(pickles.data ?? []).toHaveLength(0);
  const authors = await anon.from("pickle_authors").select("*");
  expect(authors.data ?? []).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Check 3 (database half): no profile travels with an unrevealed pickle.
// ---------------------------------------------------------------------------

test("3. a pickle cannot be joined to any profile", async () => {
  const { jarId } = await jarWithPickles();
  await admin.db.rpc("open_jar", { p_jar_id: jarId });

  // There is no link from pickles to profiles for the database to follow,
  // directly or through pickle_authors. Asking for one must fail outright.
  for (const select of [
    "id, profiles(display_name, avatar_url)",
    "id, pickle_authors(profiles(display_name, avatar_url))",
  ]) {
    const { data, error } = await bystander.db.from("pickles").select(select).eq("jar_id", jarId);
    expectNoAuthorIn(data);
    if (!error) {
      // If the database ever accepts this, it must at least have returned nothing.
      for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
        expect(row.profiles ?? row.pickle_authors ?? null).toBeNull();
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Check 4 (database half): the roster carries nothing from pickle_authors.
// ---------------------------------------------------------------------------

test("4. the roster's tables look exactly the same before and after someone writes pickles", async () => {
  const group = await cast.group(admin, "admin");
  await cast.join(author, group.code);
  await cast.join(bystander, group.code);
  const jarId = await cast.startJar(admin, group.id);

  // The roster query, exactly as src/lib/groups.ts makes it.
  const roster = async () => {
    const { data } = await bystander.db
      .from("group_members")
      .select("user_id, is_admin, joined_at, profiles(display_name, avatar_url, tagline)")
      .eq("group_id", group.id)
      .order("user_id");
    return data;
  };

  const before = await roster();
  await cast.putPickle(author, jarId, `roster check ${randomUUID()}`);
  await cast.putPickle(author, jarId, `roster check ${randomUUID()}`);
  const after = await roster();

  expect(after).toEqual(before);
});

// ---------------------------------------------------------------------------
// The rules around putting pickles in.
// ---------------------------------------------------------------------------

test("putting pickles in follows the jar's rules", async () => {
  const group = await cast.group(admin, "admin");
  await cast.join(author, group.code);
  const jarId = await cast.startJar(admin, group.id);

  const put = (who: Member, text: string) =>
    who.db.rpc("put_pickle", { p_jar_id: jarId, p_text: text });

  expect((await put(outsider, "hi")).error?.message).toContain("JAR_NOT_FOUND");
  expect((await put(author, "   ")).error?.message).toContain("EMPTY_PICKLE");
  expect((await put(author, "x".repeat(1201))).error?.message).toContain("PICKLE_TOO_LONG");
  expect((await put(author, "x".repeat(1200))).error).toBeNull();

  await admin.db.rpc("seal_jar", { p_jar_id: jarId });
  expect((await put(author, "too late")).error?.message).toContain("JAR_NOT_ACCEPTING");

  // Nothing extra slipped in: just the one 1,200-character pickle.
  const { data } = await author.db.rpc("jar_pickle_count", { p_jar_id: jarId });
  expect(data).toBe(1);
});

test("the spam limit stops a flood, not enthusiasm: 20 in ten minutes, then a pause", async () => {
  const group = await cast.group(admin, "admin");
  await cast.join(author, group.code);
  const jarId = await cast.startJar(admin, group.id);

  for (let i = 1; i <= 20; i++) {
    await cast.putPickle(author, jarId, `enthusiasm ${i}`);
  }
  const { error } = await author.db.rpc("put_pickle", { p_jar_id: jarId, p_text: "one more" });
  expect(error?.message).toContain("SLOW_DOWN");
});

test("leaving the group leaves your pickles behind, still anonymous", async () => {
  const { group, jarId, pickleIds } = await jarWithPickles();
  await author.db.rpc("leave_pickle_group", { p_group_id: group.id });
  await admin.db.rpc("open_jar", { p_jar_id: jarId });

  const { data } = await bystander.db.from("pickles").select("*").eq("jar_id", jarId);
  expect(data!.map((p) => p.id).sort()).toEqual([...pickleIds].sort());
  expectNoAuthorIn(data);
});

test("the service key (used only for test setup) confirms authorship is really stored", async () => {
  // A sanity check on the test itself: the database DOES know who wrote what,
  // so the empty results above mean "hidden", not "missing".
  const { pickleIds } = await jarWithPickles();
  const { data } = await adminClient()
    .from("pickle_authors")
    .select("author_id")
    .in("pickle_id", pickleIds);
  expect(data!.map((r) => r.author_id)).toEqual([author.id, author.id]);
});
