import Link from "next/link";
import { requireProfile } from "@/lib/account";
import { getGroup } from "@/lib/groups";
import { formatJarDate, listPastJars } from "@/lib/jars";
import { copy } from "@/lib/copy";
import { Jar as JarArt, Shell } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Past Jars — every jar this group has opened, most recent first.
 *
 * A jar is listed by its name if it was given one, and always by the date
 * it opened.
 */
export default async function PastJarsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const account = await requireProfile();
  // getGroup is the membership check: a 404 for anyone not in the group.
  const group = await getGroup(groupId, account.userId);
  const jars = await listPastJars(groupId);

  return (
    <Shell>
      <Link
        href={`/groups/${group.id}`}
        className="text-sm font-bold text-pickle underline underline-offset-4"
      >
        &larr; {group.name}
      </Link>

      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
        {copy.jar.pastTitle}
      </h1>

      {jars.length === 0 ? (
        <p className="mt-6 text-base text-ink-soft">{copy.jar.emptyArchive}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {jars.map((jar) => {
            const opened = copy.jar.openedOn(formatJarDate(jar.openedAt!));
            return (
              <li key={jar.id}>
                <Link
                  href={`/groups/${group.id}/jars/${jar.id}`}
                  className="flex items-center gap-4 rounded-2xl border-2 border-brine bg-paper-raised px-4 py-3 hover:border-pickle"
                >
                  <JarArt fill={0} className="h-12 w-10 flex-none" label="" />
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold text-ink">
                      {jar.name ?? opened}
                    </span>
                    {jar.name ? (
                      <span className="block text-sm text-ink-soft">{opened}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
