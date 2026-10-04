import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/account";
import { getGroup } from "@/lib/groups";
import { formatJarDate, getJar } from "@/lib/jars";
import { listOpenedPickles } from "@/lib/pickles";
import { renameJar } from "@/lib/actions/jars";
import { copy } from "@/lib/copy";
import { Field, Jar as JarArt, Shell, inputClass } from "@/components/ui";
import { PendingButton } from "@/components/jar-controls";

export const dynamic = "force-dynamic";

/** Gap between one pickle appearing and the next. A Design Stage number. */
const REVEAL_STEP_MS = 350;

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

  const pickles = await listOpenedPickles(jar.id);

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

      {pickles.length === 0 ? (
        <section className="mt-10 rounded-2xl border-2 border-dashed border-brine bg-paper-raised px-6 py-12 text-center">
          <p className="text-lg font-semibold text-ink-soft">
            {copy.jar.nobodyPutAnything}
          </p>
        </section>
      ) : (
        // Each pickle is a note: its words in handwriting, and either
        // "Anonymous" or — for the viewer's own only — "You wrote this".
        // Nothing else about authorship exists on this page to show.
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pickles.map((pickle, index) => (
            <li
              key={pickle.id}
              data-testid="pickle"
              className="pickle-reveal flex flex-col rounded-2xl border-2 border-brine bg-paper-raised px-5 py-4 shadow-sm"
              style={{ ["--reveal-delay" as string]: `${index * REVEAL_STEP_MS}ms` }}
            >
              <p className="flex-1 whitespace-pre-wrap break-words font-hand text-2xl leading-snug text-ink">
                {pickle.text}
              </p>
              <p
                className={`mt-4 text-xs font-bold uppercase tracking-[0.14em] ${
                  pickle.isMine ? "text-ember" : "text-ink-faint"
                }`}
              >
                {pickle.isMine ? copy.pickle.youWroteThis : copy.pickle.anonymous}
              </p>
            </li>
          ))}
        </ul>
      )}

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
