"use client";

import { useActionState, useState } from "react";
import { putPickle, type PutPickleState } from "@/lib/actions/pickles";
import { copy } from "@/lib/copy";
import { Button, Notice, inputClass } from "@/components/ui";
import { PendingButton } from "@/components/jar-controls";

/** The limit the database enforces. Shown here so nobody is surprised by it. */
const MAX_CHARACTERS = 1200;

const EMPTY: PutPickleState = { status: "idle" };

/**
 * Writing a pickle: write, preview, put it in (spec section 7).
 *
 * The preview shows the words in the handwriting face, exactly as they will
 * appear when the jar is opened.
 */
export function PickleForm({ groupId, jarId }: { groupId: string; jarId: string }) {
  const [state, action] = useActionState(putPickle, EMPTY);
  const [text, setText] = useState(state.text ?? "");
  const [previewing, setPreviewing] = useState(false);

  // If submitting failed, the action hands the writing back; show it again.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.text !== undefined) setText(state.text);
    setPreviewing(false);
  }

  const length = text.trim().length;
  const left = MAX_CHARACTERS - length;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="jar_id" value={jarId} />
      <input type="hidden" name="text" value={text} />

      {state.status === "error" ? <Notice>{state.message}</Notice> : null}

      {previewing ? (
        <>
          <div
            className="min-h-40 whitespace-pre-wrap rounded-2xl border-2 border-brine bg-paper-raised px-6 py-5 font-hand text-2xl leading-snug text-ink"
            data-testid="pickle-preview"
          >
            {text.trim()}
          </div>
          <p className="text-sm text-ink-faint">{copy.pickle.previewNote}</p>
          <div className="flex flex-wrap gap-3">
            <PendingButton label={copy.pickle.putItIn} busyLabel={copy.pickle.puttingIn} />
            <Button type="button" variant="quiet" onClick={() => setPreviewing(false)}>
              {copy.pickle.keepEditing}
            </Button>
          </div>
        </>
      ) : (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-ink">
              {copy.pickle.textLabel}
            </span>
            <textarea
              className={`${inputClass} min-h-48 resize-y`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={copy.pickle.textPlaceholder}
              autoFocus
            />
          </label>
          <p className={`text-xs ${left < 0 ? "font-bold text-alarm" : "text-ink-faint"}`}>
            {left < 0 ? copy.pickle.tooLongBy(-left) : copy.pickle.charactersLeft(left)}
          </p>
          <Button
            type="button"
            disabled={length === 0 || left < 0}
            onClick={() => setPreviewing(true)}
          >
            {copy.pickle.preview}
          </Button>
        </>
      )}
    </form>
  );
}
