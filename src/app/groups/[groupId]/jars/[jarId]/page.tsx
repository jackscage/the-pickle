import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/account";
import { getGroup } from "@/lib/groups";
import { formatJarDate, getJar } from "@/lib/jars";
import { renameJar } from "@/lib/actions/jars";
import { copy } from "@/lib/copy";
import { Field, Jar as JarArt, Shell, inputClass } from "@/components/ui";
import { PendingButton } from "@/components/jar-controls";

export const dynamic = "force-dynamic";

/**
 * An opened jar — the reveal, and afterwards its place in Past Jars.
 *
 * A jar that has not been opened yet has nothing to show here, so anyone
 * arriving early is sent back to the group's Current Jar.
 */
export default async function OpenedJarPage({
  params,
}: {
  params: Promise<{ groupId: string; jarId: string }>;
}) {
  const { groupId, jarId } = await params;
  const account = await requireProfile();
  const group = await getGroup(groupId, account.userId);
  const jar = await getJar(groupId, jarId);

  if (jar.status !== "opened") redirect(`/groups/${groupId}`);

  const opened = copy.jar.openedOn(formatJarDate(jar.openedAt!));

  return (
    <Shell wide>
      <Link
        href={`/groups/${group.id}/past`}
        className="text-sm font-bold text-pickle underline underline-offset-4"
      >
        &larr; {copy.jar.pastTitle}
      </Link>

      <header className="mt-5 flex items-center gap-4">
        <JarArt fill={0} className="h-16 w-12 flex-none" label="" />
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-extrabold tracking-tight">
            {jar.name ?? opened}
          </h1>
          {jar.name ? <p className="text-sm text-ink-soft">{opened}</p> : null}
        </div>
      </header>

      {/* The pickles go here once they exist (phase 7). Until then every
          jar really was empty, so this is the true state, not a placeholder. */}
      <section className="mt-10 rounded-2xl border-2 border-dashed border-brine bg-paper-raised px-6 py-12 text-center">
        <p className="text-lg font-semibold text-ink-soft">
          {copy.jar.nobodyPutAnything}
        </p>
      </section>

      {group.youAreAdmin ? (
        <form action={renameJar} className="mt-10 flex max-w-md items-end gap-2">
          <input type="hidden" name="group_id" value={group.id} />
          <input type="hidden" name="jar_id" value={jar.id} />
          <input type="hidden" name="back" value={`/groups/${group.id}/jars/${jar.id}`} />
          <div className="flex-1">
            <Field label={copy.jar.nameLabel}>
              <input
                className={inputClass}
                name="name"
                maxLength={60}
                defaultValue={jar.name ?? ""}
                placeholder={copy.jar.namePlaceholder}
              />
            </Field>
          </div>
          <PendingButton label={copy.jar.renameSave} variant="quiet" />
        </form>
      ) : null}
    </Shell>
  );
}
