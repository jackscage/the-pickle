"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setPassword, type PasswordState } from "@/lib/actions/profile";
import { copy } from "@/lib/copy";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const EMPTY: PasswordState = { status: "idle" };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending} className="w-full">
      {pending ? copy.profile.saving : copy.password.set}
    </Button>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(setPassword, EMPTY);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" ? <Notice>{state.message}</Notice> : null}
      {state.status === "saved" ? (
        <Notice tone="good">{state.message}</Notice>
      ) : null}

      <Field label={copy.password.newLabel}>
        <input
          className={inputClass}
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field label={copy.password.confirmLabel}>
        <input
          className={inputClass}
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Submit />
    </form>
  );
}
