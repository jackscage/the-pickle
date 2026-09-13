import Link from "next/link";
import { requireProfile } from "@/lib/account";
import { getGroup, formatPickleCode } from "@/lib/groups";
import { leaveGroup, regenerateCode } from "@/lib/actions/groups";
import { copy } from "@/lib/copy";
import { Button, Notice, Shell } from "@/components/ui";
import { CopyCodeButton } from "../../group-forms";

export const dynamic = "force-dynamic";

/**
 * Group settings.
 *
 * Only the parts of section 15 that this phase's schema supports: the code,
 * regenerating it, and leaving. Sealing and opening jars, the moderation
 * queue, removing members and locking the group arrive with phases 8 and 13 —
 * putting dead buttons here now would only teach people they don't work.
 */
export default async function GroupSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ error?: string; codechanged?: string }>;
}) {
  const { groupId } = await params;
  const { error, codechanged } = await searchParams;

  const account = await requireProfile();
  const group = await getGroup(groupId, account.userId);

  return (
    <Shell>
      <Link
        href={`/groups/${group.id}`}
        className="text-sm font-bold text-pickle underline underline-offset-4"
      >
        &larr; {group.name}
      </Link>

      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
        Group settings
      </h1>

      {error ? (
        <div className="mt-5">
          <Notice>{error}</Notice>
        </div>
      ) : null}
      {codechanged ? (
        <div className="mt-5">
          <Notice tone="good">
            New code below. The old one has stopped working.
          </Notice>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-xl font-extrabold tracking-tight">
          {copy.terms.code}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Anyone with this code can join, up to {group.memberCap} people.{" "}
          {copy.groups.memberCount(group.memberCount)} so far.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="rounded-xl border-2 border-brine bg-paper-raised px-4 py-3 font-mono text-xl font-bold tracking-[0.25em] text-ink">
            {formatPickleCode(group.pickleCode)}
          </code>
          <CopyCodeButton code={group.pickleCode} />
        </div>

        {group.youAreAdmin ? (
          <form action={regenerateCode} className="mt-5">
            <input type="hidden" name="group_id" value={group.id} />
            <p className="mb-3 text-sm text-ink-soft">
              {copy.groups.regenerateConfirm}
            </p>
            <Button type="submit" variant="secondary">
              {copy.groups.regenerate}
            </Button>
          </form>
        ) : null}
      </section>

      <hr className="my-10 border-brine" />

      <section>
        <h2 className="text-xl font-extrabold tracking-tight">Leaving</h2>
        <p className="mt-2 text-sm text-ink-soft">{copy.groups.leaveConfirm}</p>
        <form action={leaveGroup} className="mt-4">
          <input type="hidden" name="group_id" value={group.id} />
          <Button type="submit" variant="danger">
            {copy.groups.leave}
          </Button>
        </form>
      </section>

      <p className="mt-10 text-xs text-ink-faint">
        Sealing and opening jars, moderation and removing members arrive with
        the jar itself, in a later phase.
      </p>
    </Shell>
  );
}
