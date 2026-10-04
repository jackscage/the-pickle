"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { openJar } from "@/lib/actions/jars";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui";

/**
 * Small interactive pieces of the jar screens.
 *
 * These only arrange buttons. Whether an action is allowed is decided by the
 * database function it calls, never here.
 */

/** A submit button that says it is working while the form is sending. */
export function PendingButton({
  label,
  busyLabel,
  variant = "primary",
  className = "",
}: {
  label: string;
  busyLabel?: string;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending && busyLabel ? busyLabel : label}
    </Button>
  );
}

/**
 * Open The Jar, in two steps.
 *
 * Opening is permanent, so the first tap only asks. The second — after the
 * spec's own warning, "Once opened, the Pickle cannot be resealed." —
 * actually opens it. Cancel puts things back as they were.
 */
export function OpenJarButton({ groupId, jarId }: { groupId: string; jarId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" onClick={() => setConfirming(true)}>
        {copy.terms.open}
      </Button>
    );
  }

  return (
    <form
      action={openJar}
      className="rounded-2xl border-2 border-ember bg-ember/10 px-5 py-4"
    >
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="jar_id" value={jarId} />
      <p className="font-bold text-ink">{copy.jar.openConfirm}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <PendingButton label={copy.jar.openYes} busyLabel={copy.jar.loading} />
        <Button type="button" variant="quiet" onClick={() => setConfirming(false)}>
          {copy.common.cancel}
        </Button>
      </div>
    </form>
  );
}
