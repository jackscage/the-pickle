import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Pretend people for the tests.
 *
 * Each test makes the members it needs — an admin, an ordinary member, an
 * outsider — signs each one in, and deletes them all afterwards. Every
 * pretend account has an email ending in @pickle-test.invalid, a domain that
 * by internet rules can never receive mail, so they are easy to recognise
 * and impossible to confuse with a real person.
 *
 * This file uses the TEST project's service role key, which can do anything
 * in the test database. It uses it for exactly two jobs: making accounts and
 * cleaning up. Every check a test actually makes runs as a normal signed-in
 * member, with only the powers a real member would have.
 */

const LIVE_PROJECT_REF = "jcbcisuffkkftrskcimt";

function settings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  // Checked again here, not only in playwright.config.ts: this is the file
  // that creates and deletes accounts, so it is the one that must be sure.
  if (url.includes(LIVE_PROJECT_REF)) {
    throw new Error("Refusing to create test accounts in the LIVE database.");
  }
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "Missing test settings. .env.test.local needs the test project's URL, " +
        "anon key and service role key.",
    );
  }
  return { url, anonKey, serviceKey };
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** The all-powerful client. Setup and cleanup only — never for a check. */
export function adminClient(): SupabaseClient {
  const { url, serviceKey } = settings();
  return createClient(url, serviceKey, noSession);
}

/** Someone who is not signed in at all. */
export function signedOutClient(): SupabaseClient {
  const { url, anonKey } = settings();
  return createClient(url, anonKey, noSession);
}

export type Member = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  /** Signed in as this person, with exactly their powers. */
  db: SupabaseClient;
};

/** Makes the people a test needs, and tidies them away afterwards. */
export class Cast {
  private members: Member[] = [];
  private groupIds: string[] = [];

  /** A signed-in pretend person with a finished profile. */
  async member(displayName: string): Promise<Member> {
    const admin = adminClient();
    const email = `${randomUUID()}@pickle-test.invalid`;
    const password = `pw-${randomUUID()}`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      throw new Error(`Could not make a test account: ${createError?.message}`);
    }

    const { url, anonKey } = settings();
    const db = createClient(url, anonKey, noSession);

    // Noted for cleanup straight away, before anything else can fail —
    // otherwise a failed sign-in below would leave this account behind.
    const member = { id: created.user.id, email, password, displayName, db };
    this.members.push(member);

    const { error: signInError } = await db.auth.signInWithPassword({ email, password });
    if (signInError) throw new Error(`Test sign-in failed: ${signInError.message}`);

    // Made as the person themselves, the same way the welcome screen does.
    const { error: profileError } = await db
      .from("profiles")
      .insert({ id: created.user.id, display_name: displayName });
    if (profileError) throw new Error(`Test profile failed: ${profileError.message}`);

    return member;
  }

  /** Makes a group with `creator` as its admin, and remembers to delete it. */
  async group(
    creator: Member,
    jarStartMode: "admin" | "automatic" = "admin",
  ): Promise<{ id: string; code: string }> {
    const { data, error } = await creator.db
      .rpc("create_pickle_group", {
        p_name: `Test group ${randomUUID().slice(0, 8)}`,
        p_jar_start_mode: jarStartMode,
      })
      .single();
    if (error || !data) throw new Error(`Test group failed: ${error?.message}`);

    const group = data as { group_id: string; pickle_code: string };
    this.groupIds.push(group.group_id);
    return { id: group.group_id, code: group.pickle_code };
  }

  /** Puts `member` into a group using its Pickle Code, like the join screen. */
  async join(member: Member, code: string): Promise<void> {
    const { error } = await member.db.rpc("join_pickle_group", { p_code: code });
    if (error) throw new Error(`Test join failed: ${error.message}`);
  }

  /**
   * Deletes everything this test made. Groups first (which takes their jars
   * and memberships with them), then the accounts (which takes profiles).
   */
  async cleanUp(): Promise<void> {
    const admin = adminClient();
    if (this.groupIds.length > 0) {
      await admin.from("pickle_groups").delete().in("id", this.groupIds);
    }
    for (const member of this.members) {
      await admin.auth.admin.deleteUser(member.id);
    }
    this.members = [];
    this.groupIds = [];
  }
}
