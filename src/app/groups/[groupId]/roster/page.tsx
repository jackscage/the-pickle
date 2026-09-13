import Link from "next/link";
import { requireProfile } from "@/lib/account";
import { getGroup, getRoster } from "@/lib/groups";
import { copy } from "@/lib/copy";
import { Shell } from "@/components/ui";
import { Roster } from "@/components/roster";

export const dynamic = "force-dynamic";

/** The roster as its own screen, which is how it is reached on a phone. */
export default async function RosterPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const account = await requireProfile();
  const group = await getGroup(groupId, account.userId);
  const roster = await getRoster(groupId, account.userId);

  return (
    <Shell>
      <Link
        href={`/groups/${group.id}`}
        className="text-sm font-bold text-pickle underline underline-offset-4"
      >
        &larr; {group.name}
      </Link>

      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
        {copy.roster.title}
      </h1>
      <p className="mt-2 text-base text-ink-soft">{copy.roster.blurb}</p>

      <div className="mt-7">
        <Roster entries={roster} cap={group.memberCap} />
      </div>
    </Shell>
  );
}
