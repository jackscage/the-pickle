/**
 * Turning a screen's address into plain English, for the feedback pool.
 *
 * The pool is read by a board that may never have used the app, so
 * "/groups/1f3c…/put" is recorded as "Writing a pickle". Group and jar ids
 * are picked out too, so their names can be looked up and stored with the
 * report.
 *
 * No address in this app contains a pickle id, so none can be recorded.
 */

const ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const SCREENS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: new RegExp(`^/groups/(${ID})/jars/(${ID})$`), name: "An opened jar" },
  { pattern: new RegExp(`^/groups/(${ID})/put$`), name: "Writing a pickle" },
  { pattern: new RegExp(`^/groups/(${ID})/past$`), name: "Past Jars" },
  { pattern: new RegExp(`^/groups/(${ID})/roster$`), name: "The Roster" },
  { pattern: new RegExp(`^/groups/(${ID})/settings$`), name: "Group settings" },
  { pattern: new RegExp(`^/groups/(${ID})$`), name: "A group's jar" },
  { pattern: /^\/groups\/new$/, name: "Starting a group" },
  { pattern: /^\/groups\/join$/, name: "Joining a group" },
  { pattern: /^\/groups$/, name: "The list of groups" },
  { pattern: /^\/settings$/, name: "Profile settings" },
  { pattern: /^\/welcome$/, name: "Setting up a profile" },
  { pattern: /^\/sign-in$/, name: "Signing in" },
  { pattern: /^\/feedback$/, name: "The feedback pool" },
];

export type Screen = { name: string; groupId: string | null; jarId: string | null };

export function describeScreen(path: string): Screen {
  for (const { pattern, name } of SCREENS) {
    const match = path.match(pattern);
    if (match) return { name, groupId: match[1] ?? null, jarId: match[2] ?? null };
  }
  return { name: "Another screen", groupId: null, jarId: null };
}
