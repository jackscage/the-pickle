import { copy } from "@/lib/copy";
import { Avatar } from "@/components/ui";
import type { RosterEntry } from "@/lib/groups";

/**
 * The Roster (spec section 15a).
 *
 * Shows: display name, picture, tagline, and a marker for admins.
 * Shows, and will always show, nothing about what anyone has submitted.
 *
 * The spec gives two reasons and both are worth keeping in front of whoever
 * edits this next. First, it would be meaningless — a member can put in as
 * many pickles as they like, so "has submitted" tells you nothing. Second,
 * and more seriously, it would shrink the anonymity set to a guessable size:
 * in a group of eight where five have submitted, an anonymous pickle belongs
 * to one of four people, and people will do that arithmetic.
 *
 * So: no ticks, no counts, no "still to go" list, no sorting by activity.
 */
export function Roster({
  entries,
  cap,
}: {
  entries: RosterEntry[];
  cap: number;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-soft">{copy.roster.empty}</p>;
  }

  return (
    <div>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li
            key={entry.userId}
            className="flex items-center gap-3 rounded-xl px-2 py-2"
          >
            <Avatar
              name={entry.displayName}
              url={entry.avatarUrl}
              size={40}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate font-bold text-ink">
                  {entry.displayName}
                </span>
                {entry.isYou ? (
                  <span className="flex-none text-xs font-bold uppercase tracking-wider text-ink-faint">
                    {copy.groups.you}
                  </span>
                ) : null}
              </span>
              {entry.tagline ? (
                <span className="block truncate text-sm text-ink-soft">
                  {entry.tagline}
                </span>
              ) : null}
            </span>
            {entry.isAdmin ? (
              <span className="flex-none rounded-full bg-brine-pale px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-pickle-deep">
                {copy.groups.admin}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-brine pt-3 text-xs text-ink-faint">
        {entries.length} of {cap}. {copy.roster.note}
      </p>
    </div>
  );
}
