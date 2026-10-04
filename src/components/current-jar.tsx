import { copy } from "@/lib/copy";
import { fullnessStage, STAGE_FILL } from "@/lib/fullness";
import { renameJar, sealJar, startJar } from "@/lib/actions/jars";
import type { Jar } from "@/lib/jars";
import { ButtonLink, Field, Jar as JarArt, inputClass } from "@/components/ui";
import { OpenJarButton, PendingButton } from "@/components/jar-controls";

/**
 * The middle of the group screen: the Current Jar, or the lack of one.
 *
 * Admin controls appear only for admins, but that is presentation. The
 * database functions behind each button check again and refuse anyone else.
 *
 * `pickleCount` is used here, on the server, only to pick a fullness stage.
 * The number itself is never shown or sent to the browser (spec section 10:
 * stages, not counts).
 */
export function CurrentJar({
  groupId,
  jar,
  pickleCount,
  memberCount,
  youAreAdmin,
}: {
  groupId: string;
  jar: Jar | null;
  pickleCount: number;
  memberCount: number;
  youAreAdmin: boolean;
}) {
  if (!jar) {
    return <NoCurrentJar groupId={groupId} youAreAdmin={youAreAdmin} />;
  }

  const stage = fullnessStage(pickleCount, memberCount);
  const stageName = copy.jar.stages[stage];

  return (
    <section className="flex flex-col items-center rounded-2xl border-2 border-brine bg-paper-raised px-6 py-10 text-center">
      <JarArt fill={STAGE_FILL[stage]} label={copy.jar.stageLabel(stageName)} />

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-pickle">
        {copy.jar.currentLabel}
      </p>
      {jar.name ? (
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{jar.name}</h2>
      ) : null}
      <p className="mt-2 text-lg font-bold text-ink" data-testid="fullness-stage">
        {stageName}
      </p>
      <p className="mt-2 max-w-sm text-sm text-ink-soft" data-testid="jar-status">
        {jar.status === "sealed" ? copy.jar.sealed : copy.jar.accepting}
      </p>

      {jar.status === "accepting" && pickleCount === 0 ? (
        <p className="mt-6 text-sm font-semibold text-pickle">{copy.jar.emptyCurrent}</p>
      ) : null}

      {jar.status === "accepting" ? (
        <ButtonLink href={`/groups/${groupId}/put`} className="mt-6">
          {copy.terms.submit}
        </ButtonLink>
      ) : null}

      {youAreAdmin ? <AdminControls groupId={groupId} jar={jar} /> : null}
    </section>
  );
}

function NoCurrentJar({ groupId, youAreAdmin }: { groupId: string; youAreAdmin: boolean }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border-2 border-dashed border-brine bg-paper-raised px-6 py-10 text-center">
      <JarArt fill={0} label={copy.jar.noneTitle} />
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight">{copy.jar.noneTitle}</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        {youAreAdmin ? copy.jar.noneAdmin : copy.jar.noneMember}
      </p>

      {youAreAdmin ? (
        <form action={startJar} className="mt-6 w-full max-w-sm space-y-4 text-left">
          <input type="hidden" name="group_id" value={groupId} />
          <Field label={copy.jar.nameLabel}>
            <input
              className={inputClass}
              name="name"
              maxLength={60}
              placeholder={copy.jar.namePlaceholder}
            />
          </Field>
          <PendingButton
            label={copy.jar.start}
            busyLabel={copy.jar.starting}
            className="w-full"
          />
        </form>
      ) : null}
    </section>
  );
}

function AdminControls({ groupId, jar }: { groupId: string; jar: Jar }) {
  return (
    <div className="mt-8 w-full max-w-sm border-t-2 border-brine pt-6 text-left">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
        {copy.jar.adminTitle}
      </p>

      <div className="mt-4 space-y-4">
        <OpenJarButton groupId={groupId} jarId={jar.id} />

        {jar.status === "accepting" ? (
          <form action={sealJar}>
            <input type="hidden" name="group_id" value={groupId} />
            <input type="hidden" name="jar_id" value={jar.id} />
            <PendingButton label={copy.terms.seal} variant="secondary" />
            <p className="mt-1.5 text-xs text-ink-faint">{copy.jar.sealExplain}</p>
          </form>
        ) : null}

        <form action={renameJar} className="flex items-end gap-2">
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="jar_id" value={jar.id} />
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
      </div>
    </div>
  );
}
