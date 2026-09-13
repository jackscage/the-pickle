"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { saveProfile, type ProfileState } from "@/lib/actions/profile";
import { copy } from "@/lib/copy";
import { Avatar, Button, Field, Notice, inputClass } from "@/components/ui";

/**
 * The profile form, used both for first setup and for later editing.
 *
 * The picture is uploaded the moment it is chosen, straight from this browser
 * to Supabase storage, and what reaches the server action is just its
 * address. Storage rules only let someone write into a folder named with
 * their own user id, so this is not a case of trusting the browser — the
 * database would refuse anything else.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const EMPTY: ProfileState = { status: "idle" };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? copy.profile.saving : label}
    </Button>
  );
}

export function ProfileForm({
  userId,
  initial,
  redirectTo,
  submitLabel = copy.profile.save,
}: {
  userId: string;
  initial: {
    displayName: string;
    tagline: string | null;
    avatarUrl: string | null;
  };
  redirectTo?: string;
  submitLabel?: string;
}) {
  const [state, action] = useActionState(saveProfile, EMPTY);

  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [removed, setRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [name, setName] = useState(initial.displayName);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError(copy.profile.pictureWrongType);
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError(copy.profile.pictureTooBig);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      // The folder must be the user's id — that is what the storage rule
      // checks. The timestamp avoids a stale cached copy of the old picture.
      const path = `${userId}/avatar-${Date.now()}.${extension}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      setAvatarUrl(publicUrl);
      setRemoved(false);
    } catch {
      setUploadError(copy.profile.pictureFailed);
    } finally {
      setUploading(false);
    }
  }

  const shownAvatar = removed ? null : avatarUrl;

  return (
    <form action={action} className="space-y-6">
      {redirectTo ? (
        <input type="hidden" name="redirect_to" value={redirectTo} />
      ) : null}
      <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />
      <input type="hidden" name="remove_avatar" value={removed ? "1" : "0"} />

      {state.status === "error" ? <Notice>{state.message}</Notice> : null}
      {state.status === "saved" ? (
        <Notice tone="good">{state.message}</Notice>
      ) : null}

      <Field label={copy.profile.displayNameLabel}>
        <input
          className={inputClass}
          name="display_name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={copy.profile.displayNamePlaceholder}
          maxLength={40}
          autoComplete="nickname"
          required
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-bold text-ink">
          {copy.profile.pictureLabel}
        </span>
        <div className="flex items-center gap-4">
          <Avatar name={name || "?"} url={shownAvatar} size={64} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="rounded-lg border-2 border-brine px-3 py-2 text-sm font-bold text-pickle hover:bg-pickle/10 disabled:opacity-55"
            >
              {uploading ? "Uploading…" : copy.profile.pictureChoose}
            </button>
            {shownAvatar ? (
              <button
                type="button"
                onClick={() => {
                  setRemoved(true);
                  setAvatarUrl(null);
                }}
                className="rounded-lg px-3 py-2 text-sm font-bold text-ink-soft hover:text-alarm"
              >
                {copy.profile.pictureRemove}
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        <span className="mt-2 block text-xs text-ink-faint">
          {copy.profile.pictureHint}
        </span>
        {uploadError ? (
          <p className="mt-2 text-xs font-bold text-alarm">{uploadError}</p>
        ) : null}
      </div>

      <Field label={copy.profile.taglineLabel} hint={copy.profile.taglineHint}>
        <input
          className={inputClass}
          name="tagline"
          defaultValue={initial.tagline ?? ""}
          placeholder={copy.profile.taglinePlaceholder}
          maxLength={60}
        />
      </Field>

      <Submit label={submitLabel} />
    </form>
  );
}
