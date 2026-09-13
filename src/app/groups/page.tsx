import Link from "next/link";
import { requireProfile } from "@/lib/account";
import { listMyGroups, formatPickleCode } from "@/lib/groups";
import { copy } from "@/lib/copy";
import { Avatar, ButtonLink, Jar, Shell } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The hub: every group you're in, and the two ways to get into another one.
 *
 * If you're in exactly one group this is a screen you pass through, not one
 * you use — but most of the camp-staff group will end up in more than one.
 */
export default async function GroupsPage() {
  const account = await requireProfile();
  const groups = await listMyGroups(account.userId);

  return (
    <Shell>
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {copy.groups.hubTitle}
        </h1>
        <Link href="/settings" className="flex items-center gap-2">
          <span className="sr-only">{copy.common.settings}</span>
          <Avatar
            name={account.profile.display_name}
            url={account.profile.avatar_url}
            size={36}
          />
        </Link>
      </header>

      {groups.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <Jar fill={0} className="h-32 w-24" label="An empty pickle jar" />
          <p className="mt-6 max-w-xs text-base text-ink-soft">
            {copy.groups.hubEmpty}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center gap-4 rounded-2xl border-2 border-brine bg-paper-raised px-4 py-4 transition-colors hover:border-pickle"
              >
                <Jar fill={0} className="h-12 w-10 flex-none" label="" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-extrabold text-ink">
                    {group.name}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {copy.groups.memberCount(group.memberCount)}
                    {group.youAreAdmin ? ` · ${copy.groups.admin}` : ""}
                    {group.locked ? " · Locked" : ""}
                  </span>
                </span>
                <span className="hidden flex-none font-mono text-sm tracking-widest text-ink-faint sm:block">
                  {formatPickleCode(group.pickleCode)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <ButtonLink href="/groups/join">{copy.groups.join}</ButtonLink>
        <ButtonLink href="/groups/new" variant="secondary">
          {copy.groups.create}
        </ButtonLink>
      </div>
    </Shell>
  );
}
