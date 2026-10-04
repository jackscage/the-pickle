import Link from "next/link";
import { requireProfile } from "@/lib/account";
import { getGroup, getRoster, formatPickleCode } from "@/lib/groups";
import { copy, groupErrorMessage } from "@/lib/copy";
import { getCurrentJar } from "@/lib/jars";
import { Avatar, Notice, Shell } from "@/components/ui";
import { Roster } from "@/components/roster";
import { CurrentJar } from "@/components/current-jar";
import { CopyCodeButton } from "../group-forms";

export const dynamic = "force-dynamic";

/**
 * The Current Jar screen — the home of a Pickle Group.
 *
 * The middle is the Current Jar (or the lack of one); the roster sits
 * around it.
 *
 * Layout follows section 18: the roster sits beside the jar on a wide screen
 * and becomes its own screen on a phone, where a cramped sidebar would be
 * worse than a second tap.
 */
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ new?: string; error?: string }>;
}) {
  const { groupId } = await params;
  const { new: justCreated, error } = await searchParams;

  const account = await requireProfile();
  const group = await getGroup(groupId, account.userId);
  const roster = await getRoster(groupId, account.userId);
  const jar = await getCurrentJar(groupId);

  // Pickles arrive in phase 7. Until then every jar is empty, and the
  // fullness picture is fed zero. Phase 7 replaces this with a count from a
  // database function that returns one number and nothing else.
  const pickleCount = 0;

  return (
    <Shell wide>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/groups"
            className="text-sm font-bold text-pickle underline underline-offset-4"
          >
            &larr; All groups
          </Link>
          <h1 className="mt-2 truncate text-3xl font-extrabold tracking-tight">
            {group.name}
          </h1>
        </div>
        <div className="flex flex-none items-center gap-3">
          <Link
            href={`/groups/${group.id}/settings`}
            className="text-sm font-bold text-pickle underline underline-offset-4"
          >
            {copy.common.settings}
          </Link>
          <Link href="/settings">
            <span className="sr-only">Your profile</span>
            <Avatar
              name={account.profile.display_name}
              url={account.profile.avatar_url}
              size={36}
            />
          </Link>
        </div>
      </header>

      {error ? (
        <div className="mt-6">
          <Notice>{groupErrorMessage(error)}</Notice>
        </div>
      ) : null}

      {justCreated ? (
        <section className="mt-6 rounded-2xl border-2 border-ember bg-ember/10 px-5 py-5">
          <h2 className="text-lg font-extrabold text-ink">
            Your group exists. Now get people into it.
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            Send them this code. Anyone with it can join, up to{" "}
            {group.memberCap} people.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-xl border-2 border-ember bg-paper-raised px-4 py-3 font-mono text-2xl font-bold tracking-[0.25em] text-ink">
              {formatPickleCode(group.pickleCode)}
            </code>
            <CopyCodeButton code={group.pickleCode} />
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <CurrentJar
            groupId={group.id}
            jar={jar}
            pickleCount={pickleCount}
            memberCount={group.memberCount}
            youAreAdmin={group.youAreAdmin}
          />
          <Link
            href={`/groups/${group.id}/past`}
            className="mt-4 inline-block text-sm font-bold text-pickle underline underline-offset-4"
          >
            {copy.jar.pastLink} &rarr;
          </Link>
        </div>

        {/* The roster: a panel here, its own screen on a phone */}
        <aside className="hidden lg:block">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-ink-faint">
            {copy.roster.title}
          </h2>
          <Roster entries={roster} cap={group.memberCap} />
        </aside>

        <Link
          href={`/groups/${group.id}/roster`}
          className="flex items-center justify-between rounded-2xl border-2 border-brine bg-paper-raised px-5 py-4 lg:hidden"
        >
          <span>
            <span className="block font-extrabold text-ink">
              {copy.roster.title}
            </span>
            <span className="block text-sm text-ink-soft">
              {copy.groups.memberCount(group.memberCount)}
            </span>
          </span>
          <span className="flex -space-x-2">
            {roster.slice(0, 4).map((entry) => (
              <Avatar
                key={entry.userId}
                name={entry.displayName}
                url={entry.avatarUrl}
                size={32}
              />
            ))}
          </span>
        </Link>
      </div>
    </Shell>
  );
}
