import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/account";

/**
 * Reading Pickle Groups and rosters.
 *
 * ---------------------------------------------------------------------------
 * A NOTE THAT MATTERS MORE THAN IT LOOKS (spec sections 9 and 15a)
 * ---------------------------------------------------------------------------
 * The roster is, in the spec's own words, "the most tempting place in the
 * entire app to accidentally join authorship onto a name." It is the one query
 * that already has every member's identity in hand.
 *
 * So the rule for this file, permanently: the roster query selects from
 * group_members and profiles, and from nothing else. When the pickles tables
 * arrive in phase 7, they do not get added here — not as a count, not as a
 * "has submitted" flag, not as a left join "for later." If a future change
 * wants submission information on the roster, that change is wrong, and the
 * place to argue about it is the spec, not this file.
 * ---------------------------------------------------------------------------
 */

export type GroupSummary = {
  id: string;
  name: string;
  pickleCode: string;
  locked: boolean;
  memberCap: number;
  adminMode: "designated" | "everyone";
  memberCount: number;
  youAreAdmin: boolean;
};

export type RosterEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  tagline: string | null;
  isAdmin: boolean;
  isYou: boolean;
};

type MembershipRow = {
  group_id: string;
  is_admin: boolean;
  pickle_groups: {
    id: string;
    name: string;
    pickle_code: string;
    locked: boolean;
    member_cap: number;
    admin_mode: "designated" | "everyone";
  } | null;
};

/** Every group the signed-in person belongs to, newest membership first. */
export async function listMyGroups(userId: string): Promise<GroupSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_members")
    .select(
      "group_id, is_admin, pickle_groups(id, name, pickle_code, locked, member_cap, admin_mode)",
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as MembershipRow[];

  // One count query for all of them rather than one per group.
  const counts = await countMembers(rows.map((r) => r.group_id));

  return rows
    .filter((row): row is MembershipRow & { pickle_groups: NonNullable<MembershipRow["pickle_groups"]> } =>
      Boolean(row.pickle_groups),
    )
    .map((row) => ({
      id: row.pickle_groups.id,
      name: row.pickle_groups.name,
      pickleCode: row.pickle_groups.pickle_code,
      locked: row.pickle_groups.locked,
      memberCap: row.pickle_groups.member_cap,
      adminMode: row.pickle_groups.admin_mode,
      memberCount: counts.get(row.group_id) ?? 0,
      youAreAdmin:
        row.is_admin || row.pickle_groups.admin_mode === "everyone",
    }));
}

async function countMembers(groupIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (groupIds.length === 0) return counts;

  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  for (const row of (data ?? []) as { group_id: string }[]) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * One group. Returns a 404 rather than an error page if the person isn't a
 * member — the database simply hands back nothing, and "you can't see it" and
 * "it isn't there" should look identical from outside.
 */
export async function getGroup(
  groupId: string,
  userId: string,
): Promise<GroupSummary> {
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("pickle_groups")
    .select("id, name, pickle_code, locked, member_cap, admin_mode")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) notFound();

  const { data: me } = await supabase
    .from("group_members")
    .select("is_admin")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!me) notFound();

  const counts = await countMembers([groupId]);

  return {
    id: group.id,
    name: group.name,
    pickleCode: group.pickle_code,
    locked: group.locked,
    memberCap: group.member_cap,
    adminMode: group.admin_mode,
    memberCount: counts.get(groupId) ?? 0,
    youAreAdmin: me.is_admin || group.admin_mode === "everyone",
  };
}

type RosterRow = {
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  profiles: Pick<Profile, "display_name" | "avatar_url" | "tagline"> | null;
};

/**
 * The roster. Admins first, then alphabetically — so the people you might
 * need something from are at the top and everyone else is where you'd look.
 *
 * Read the note at the top of this file before changing what this selects.
 */
export async function getRoster(
  groupId: string,
  viewerId: string,
): Promise<RosterEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("group_members")
    .select("user_id, is_admin, joined_at, profiles(display_name, avatar_url, tagline)")
    .eq("group_id", groupId);

  if (error || !data) return [];

  const rows = data as unknown as RosterRow[];

  return rows
    .filter((row) => row.profiles !== null)
    .map((row) => ({
      userId: row.user_id,
      displayName: row.profiles!.display_name,
      avatarUrl: row.profiles!.avatar_url,
      tagline: row.profiles!.tagline,
      isAdmin: row.is_admin,
      isYou: row.user_id === viewerId,
    }))
    .sort((a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
}

/** Formats a code as XXXX-XXXX, which is easier to read aloud. */
export function formatPickleCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
