"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendFeedback, type FeedbackState } from "./actions";
import { feedbackCopy as t } from "./copy";

const EMPTY: FeedbackState = { status: "idle" };

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-ember px-4 py-2 font-bold text-paper-raised disabled:opacity-55"
    >
      {pending ? t.sending : t.send}
    </button>
  );
}

/**
 * The corner button and the small form it opens: a type, and one box.
 * (One box, not a form — every extra field means fewer reports.)
 *
 * The current screen's address goes along automatically.
 */
export function FeedbackWidget({ isReader }: { isReader: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // A fresh form each time it is reopened after sending.
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {open ? (
        <FeedbackPanel
          key={formKey}
          path={pathname}
          isReader={isReader}
          onClose={() => setOpen(false)}
          onAnother={() => setFormKey((k) => k + 1)}
        />
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full border-2 border-pickle bg-paper-raised px-4 py-2 text-sm font-bold text-pickle shadow-md hover:bg-pickle/10"
      >
        {t.button}
      </button>
    </div>
  );
}

function FeedbackPanel({
  path,
  isReader,
  onClose,
  onAnother,
}: {
  path: string;
  isReader: boolean;
  onClose: () => void;
  onAnother: () => void;
}) {
  const [state, action] = useActionState(sendFeedback, EMPTY);

  return (
    <div
      role="dialog"
      aria-label={t.title}
      className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border-2 border-brine bg-paper-raised p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink">{t.title}</h2>
        <button type="button" onClick={onClose} className="text-sm font-bold text-ink-soft">
          {t.close}
        </button>
      </div>

      {state.status === "sent" ? (
        <div className="mt-3 space-y-3">
          <p role="status" className="font-semibold text-pickle-deep">
            {t.sent}
          </p>
          <button
            type="button"
            onClick={onAnother}
            className="text-sm font-bold text-pickle underline underline-offset-4"
          >
            {t.sendAnother}
          </button>
        </div>
      ) : (
        <form action={action} className="mt-2 space-y-3">
          <p className="text-xs text-ink-faint">{t.blurb}</p>
          <input type="hidden" name="path" value={path} />

          <fieldset>
            <legend className="mb-1 text-sm font-bold text-ink">{t.kindLabel}</legend>
            <div className="space-y-1">
              {(Object.keys(t.kinds) as Array<keyof typeof t.kinds>).map((kind) => (
                <label key={kind} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="kind"
                    value={kind}
                    defaultChecked={kind === "bug"}
                    className="accent-pickle"
                  />
                  {t.kinds[kind]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-ink">{t.messageLabel}</span>
            <textarea
              name="message"
              required
              maxLength={2000}
              placeholder={t.messagePlaceholder}
              className="min-h-28 w-full rounded-xl border-2 border-brine bg-paper px-3 py-2 text-sm text-ink focus:border-pickle focus:outline-none"
            />
          </label>

          {state.status === "error" ? (
            <p role="status" className="text-sm font-semibold text-alarm">
              {state.message}
            </p>
          ) : null}

          <SendButton />
        </form>
      )}

      {isReader ? (
        <Link
          href="/feedback"
          className="mt-3 block text-xs font-bold text-pickle underline underline-offset-4"
        >
          {t.poolLink}
        </Link>
      ) : null}
    </div>
  );
}
