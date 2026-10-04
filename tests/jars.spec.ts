import { expect, test } from "@playwright/test";
import { Cast, signedOutClient, type Member } from "./helpers/members";

/**
 * The jar rules, checked directly against the database (migration 0002).
 *
 * These tests skip the screens on purpose. A rule that only holds because a
 * button is hidden is not a rule — so each test talks to the database the
 * way a determined member could, and checks the database itself says no.
 *
 * Three pretend people are made once for this file (see helpers/members.ts),
 * and every test makes its own fresh group for them, so no test can see
 * another's leftovers:
 *   admin     made the group, so is its admin
 *   member    joined with the Pickle Code, ordinary powers
 *   outsider  signed in, but not in the group at all
 *
 * (Once per file rather than once per test because the database limits how
 * many sign-ins it accepts in a few minutes, and a fresh trio for every test
 * runs straight into that limit.)
 */

type Jar = { id: string; status: string; name: string | null; opened_at: string | null };

// Run this file's tests one after another in a single worker, so they share
// one cast. ("default" rather than "serial": one failure does not skip the
// rest, so a run always reports every rule that is broken, not just the first.)
test.describe.configure({ mode: "default" });

const cast = new Cast();
let admin: Member;
let member: Member;
let outsider: Member;

test.beforeAll(async () => {
  admin = await cast.member("Test Admin");
  member = await cast.member("Test Member");
  outsider = await cast.member("Test Outsider");
});

test.afterAll(async () => {
  await cast.cleanUp();
});

async function jarsOf(who: Member, groupId: string): Promise<Jar[]> {
  const { data, error } = await who.db
    .from("jars")
    .select("id, status, name, opened_at")
    .eq("group_id", groupId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as Jar[];
}

async function currentJar(who: Member, groupId: string): Promise<Jar | undefined> {
  return (await jarsOf(who, groupId)).find((jar) => jar.status !== "opened");
}

/** Calls a database function and returns its error code, or null if it worked. */
async function attempt(who: Member, fn: string, args: Record<string, unknown>) {
  const { error } = await who.db.rpc(fn, args);
  return error ? error.message : null;
}

test.describe("a group where an admin starts each jar", () => {
  test("starts with no jar, and only an admin can start one", async () => {
    const group = await cast.group(admin, "admin");
    await cast.join(member, group.code);

    expect(await jarsOf(admin, group.id)).toHaveLength(0);

    expect(await attempt(member, "start_jar", { p_group_id: group.id })).toBe("NOT_ADMIN");
    expect(await attempt(outsider, "start_jar", { p_group_id: group.id })).toBe("NOT_ADMIN");

    expect(
      await attempt(admin, "start_jar", { p_group_id: group.id, p_name: "  Lake weekend  " }),
    ).toBeNull();

    // The ordinary member can see it, name tidied of stray spaces.
    const jar = await currentJar(member, group.id);
    expect(jar?.status).toBe("accepting");
    expect(jar?.name).toBe("Lake weekend");
  });

  test("never has two current jars", async () => {
    const group = await cast.group(admin, "admin");
    await attempt(admin, "start_jar", { p_group_id: group.id });

    expect(await attempt(admin, "start_jar", { p_group_id: group.id })).toBe(
      "JAR_ALREADY_CURRENT",
    );
    expect(await jarsOf(admin, group.id)).toHaveLength(1);
  });

  test("goes accepting → sealed → opened, and opening is permanent", async () => {
    const group = await cast.group(admin, "admin");
    await cast.join(member, group.code);
    await attempt(admin, "start_jar", { p_group_id: group.id });
    const jar = (await currentJar(admin, group.id))!;

    // Ordinary members can do neither.
    expect(await attempt(member, "seal_jar", { p_jar_id: jar.id })).toBe("NOT_ADMIN");
    expect(await attempt(member, "open_jar", { p_jar_id: jar.id })).toBe("NOT_ADMIN");

    expect(await attempt(admin, "seal_jar", { p_jar_id: jar.id })).toBeNull();
    expect((await currentJar(admin, group.id))?.status).toBe("sealed");
    expect(await attempt(admin, "seal_jar", { p_jar_id: jar.id })).toBe("JAR_NOT_ACCEPTING");

    expect(await attempt(admin, "open_jar", { p_jar_id: jar.id })).toBe(null);
    expect(await attempt(admin, "open_jar", { p_jar_id: jar.id })).toBe("JAR_ALREADY_OPENED");
    expect(await attempt(admin, "seal_jar", { p_jar_id: jar.id })).toBe("JAR_NOT_ACCEPTING");

    // It is now a Past Jar, and the group has no current jar until an admin
    // starts one.
    const all = await jarsOf(member, group.id);
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("opened");
    expect(all[0].opened_at).not.toBeNull();
    expect(await currentJar(member, group.id)).toBeUndefined();
  });

  test("can be opened straight from accepting, skipping the seal", async () => {
    const group = await cast.group(admin, "admin");
    await attempt(admin, "start_jar", { p_group_id: group.id });
    const jar = (await currentJar(admin, group.id))!;

    expect(await attempt(admin, "open_jar", { p_jar_id: jar.id })).toBeNull();
    expect((await jarsOf(admin, group.id))[0].status).toBe("opened");
  });

  test("lets an admin name, rename and clear a jar, and nobody else", async () => {
    const group = await cast.group(admin, "admin");
    await cast.join(member, group.code);
    await attempt(admin, "start_jar", { p_group_id: group.id });
    const jar = (await currentJar(admin, group.id))!;

    expect(await attempt(member, "rename_jar", { p_jar_id: jar.id, p_name: "Mine" })).toBe(
      "NOT_ADMIN",
    );

    await attempt(admin, "rename_jar", { p_jar_id: jar.id, p_name: "Bonfire night" });
    expect((await currentJar(member, group.id))?.name).toBe("Bonfire night");

    await attempt(admin, "rename_jar", { p_jar_id: jar.id, p_name: "   " });
    expect((await currentJar(member, group.id))?.name).toBeNull();
  });
});

test.describe("a group where jars start automatically", () => {
  test("gets its first jar the moment it is made", async () => {
    const group = await cast.group(admin, "automatic");
    const jars = await jarsOf(admin, group.id);
    expect(jars).toHaveLength(1);
    expect(jars[0].status).toBe("accepting");
  });

  test("starts the next jar the moment one is opened", async () => {
    const group = await cast.group(admin, "automatic");
    const first = (await currentJar(admin, group.id))!;

    await attempt(admin, "open_jar", { p_jar_id: first.id });

    const jars = await jarsOf(admin, group.id);
    expect(jars).toHaveLength(2);
    expect(jars.find((j) => j.id === first.id)?.status).toBe("opened");
    expect((await currentJar(admin, group.id))?.id).not.toBe(first.id);
  });

  test("an admin switching a group to automatic gives it a jar", async () => {
    const group = await cast.group(admin, "admin");
    expect(await jarsOf(admin, group.id)).toHaveLength(0);

    const { error } = await admin.db
      .from("pickle_groups")
      .update({ jar_start_mode: "automatic" })
      .eq("id", group.id);
    expect(error).toBeNull();

    expect((await currentJar(admin, group.id))?.status).toBe("accepting");
  });
});

test.describe("nobody gets around the rules", () => {
  test("an outsider cannot see a group's jars, or touch one", async () => {
    const group = await cast.group(admin, "automatic");
    const jar = (await currentJar(admin, group.id))!;

    expect(await jarsOf(outsider, group.id)).toHaveLength(0);

    // Indistinguishable from a jar that does not exist.
    for (const fn of ["seal_jar", "open_jar"]) {
      expect(await attempt(outsider, fn, { p_jar_id: jar.id })).toBe("JAR_NOT_FOUND");
    }
    expect(await attempt(outsider, "rename_jar", { p_jar_id: jar.id, p_name: "x" })).toBe(
      "JAR_NOT_FOUND",
    );
  });

  test("not even an admin can change a jar by writing to the table", async () => {
    const group = await cast.group(admin, "automatic");
    const jar = (await currentJar(admin, group.id))!;

    // Direct edits are silently refused: no policy allows them.
    await admin.db.from("jars").update({ status: "opened" }).eq("id", jar.id);
    expect((await currentJar(admin, group.id))?.id).toBe(jar.id);

    await admin.db.from("jars").delete().eq("id", jar.id);
    expect(await jarsOf(admin, group.id)).toHaveLength(1);

    const { error } = await admin.db.from("jars").insert({ group_id: group.id });
    expect(error).not.toBeNull();
  });

  test("the internal jar-maker cannot be called from outside", async () => {
    const group = await cast.group(admin, "admin");
    const error = await attempt(admin, "create_current_jar", { p_group_id: group.id });
    expect(error).not.toBeNull();
    expect(await jarsOf(admin, group.id)).toHaveLength(0);
  });

  test("a signed-out visitor sees no jars and can start none", async () => {
    const group = await cast.group(admin, "automatic");
    const anon = signedOutClient();

    const { data } = await anon.from("jars").select("id").eq("group_id", group.id);
    expect(data ?? []).toHaveLength(0);

    const { error } = await anon.rpc("start_jar", { p_group_id: group.id });
    expect(error).not.toBeNull();
  });
});
