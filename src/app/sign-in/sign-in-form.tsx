"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  sendMagicLink,
  signInWithPassword,
  type SignInState,
} from "./actions";
import { copy } from "@/lib/copy";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const EMPTY: SignInState = { status: "idle" };

function Submit({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? busyLabel : label}
    </Button>
  );
}

export function SignInForm({
  next,
  expired,
}: {
  next: string;
  expired: boolean;
}) {
  const [mode, setMode] = useState<"link" | "password">("link");

  const [linkState, linkAction] = useActionState(sendMagicLink, EMPTY);
  const [passwordState, passwordAction] = useActionState(
    signInWithPassword,
    EMPTY,
  );

  // The link has been sent. Nothing else to do on this screen but say so.
  if (linkState.status === "sent") {
    return (
      <div className="space-y-5">
        <Notice tone="good">{copy.signIn.linkSent}</Notice>
        <p className="text-sm text-ink-soft">
          Sent to <span className="font-bold text-ink">{linkState.email}</span>.
          If it isn&rsquo;t there in a minute, check your spam folder.
        </p>
        <form action={linkAction}>
          <input type="hidden" name="email" value={linkState.email ?? ""} />
          <input type="hidden" name="next" value={next} />
          <Submit label={copy.signIn.resend} busyLabel={copy.signIn.sending} />
        </form>
      </div>
    );
  }

  if (mode === "password") {
    return (
      <div className="space-y-5">
        {passwordState.status === "error" ? (
          <Notice>{passwordState.message}</Notice>
        ) : expired ? (
          <Notice>{copy.signIn.linkExpired}</Notice>
        ) : null}

        <form action={passwordAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label={copy.signIn.emailLabel}>
            <input
              className={inputClass}
              type="email"
              name="email"
              autoComplete="email"
              defaultValue={passwordState.email ?? ""}
              required
            />
          </Field>
          <Field label={copy.signIn.passwordLabel}>
            <input
              className={inputClass}
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Submit
            label={copy.signIn.signInWithPassword}
            busyLabel={copy.signIn.sending}
          />
        </form>

        <button
          type="button"
          onClick={() => setMode("link")}
          className="w-full text-sm font-bold text-pickle underline underline-offset-4"
        >
          {copy.signIn.useLink}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {linkState.status === "error" ? (
        <Notice>{linkState.message}</Notice>
      ) : expired ? (
        <Notice>{copy.signIn.linkExpired}</Notice>
      ) : null}

      <form action={linkAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field
          label={copy.signIn.emailLabel}
          hint="New here or coming back — same box either way."
        >
          <input
            className={inputClass}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={linkState.email ?? ""}
            required
          />
        </Field>
        <Submit label={copy.signIn.sendLink} busyLabel={copy.signIn.sending} />
      </form>

      <button
        type="button"
        onClick={() => setMode("password")}
        className="w-full text-sm font-bold text-pickle underline underline-offset-4"
      >
        {copy.signIn.usePassword}
      </button>
    </div>
  );
}
