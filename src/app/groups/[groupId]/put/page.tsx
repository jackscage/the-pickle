import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/account";
import { getGroup } from "@/lib/groups";
import { getCurrentJar } from "@/lib/jars";
import { copy } from "@/lib/copy";
import { Shell } from "@/components/ui";
import { PickleForm } from "@/components/pickle-form";

export const dynamic = "force-dynamic";

/**
 * Put It In The Pickle — the writing screen.
 *
 * Only reachable while the group's jar is taking pickles. Anyone arriving
 * when it isn't is sent back to the jar, which explains the state. (If the
 * jar is sealed while someone is mid-sentence, the database refuses the
 * pickle and the form keeps their words — see components/pickle-form.tsx.)
 */
export default async function PutPicklePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const account = await requireProfile();
  const group = await getGroup(groupId, account.userId);
  const jar = await getCurrentJar(groupId);

  if (!jar || jar.status !== "accepting") redirect(`/groups/${group.id}`);

  return (
    <Shell>
      <Link
        href={`/groups/${group.id}`}
        className="text-sm font-bold text-pickle underline underline-offset-4"
      >
        &larr; {group.name}
      </Link>

      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
        {copy.pickle.writeTitle}
      </h1>
      <p className="mt-2 text-base text-ink-soft">{copy.pickle.writeBlurb}</p>

      <div className="mt-8">
        <PickleForm groupId={group.id} jarId={jar.id} />
      </div>
    </Shell>
  );
}
