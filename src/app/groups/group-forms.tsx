"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createGroup,
  joinGroup,
  type GroupFormState,
} from "@/lib/actions/groups";
import { copy } from "@/lib/copy";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const EMPTY: GroupFormState = { status: "idle" };

function Submit({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? busyLabel : label}
    </Button>
  );
}

export function CreateGroupForm() {
  const [state, action] = useActionState(createGroup, EMPTY);

  return (
    <form action={action} className="space-y-5">
      {state.status === "error" ? <Notice>{state.message}</Notice> : null}
      <Field label={copy.groups.nameLabel}>
        <input
          className={inputClass}
          name="name"
          placeholder={copy.groups.namePlaceholder}
          maxLength={60}
          autoFocus
          required
        />
      </Field>
      <Submit
        label={copy.groups.createButton}
        busyLabel={copy.groups.creating}
      />
    </form>
  );
}

export function JoinGroupForm() {
  const [state, action] = useActionState(joinGroup, EMPTY);

  return (
    <form action={action} className="space-y-5">
      {state.status === "error" ? <Notice>{state.message}</Notice> : null}
      <Field
        label={copy.groups.codeLabel}
        hint="Capitals or lower case, dashes or not — it all works."
      >
        <input
          className={`${inputClass} text-center font-mono text-2xl uppercase tracking-[0.3em]`}
          name="code"
          placeholder="XXXX-XXXX"
          maxLength={12}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          required
        />
      </Field>
      <Submit label={copy.groups.joinButton} busyLabel={copy.groups.joining} />
    </form>
  );
}

/** Copies the code to the clipboard, with a small bit of feedback. */
export function CopyCodeButton({ code }: { code: string }) {
  return (
    <button
      type="button"
      onClick={async (event) => {
        const button = event.currentTarget;
        try {
          await navigator.clipboard.writeText(code);
          const original = button.dataset.label ?? copy.groups.copyCode;
          button.textContent = copy.groups.codeCopied;
          setTimeout(() => {
            button.textContent = original;
          }, 1600);
        } catch {
          // Clipboard access can be refused. The code is on screen anyway.
        }
      }}
      data-label={copy.groups.copyCode}
      className="rounded-lg border-2 border-brine px-3 py-2 text-sm font-bold text-pickle hover:bg-pickle/10"
    >
      {copy.groups.copyCode}
    </button>
  );
}
