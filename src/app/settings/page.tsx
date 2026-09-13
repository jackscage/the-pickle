import Link from "next/link";
import { requireProfile } from "@/lib/account";
import { copy } from "@/lib/copy";
import { Button, Shell } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const account = await requireProfile();

  return (
    <Shell>
      <Link
        href="/groups"
        className="text-sm font-bold text-pickle underline underline-offset-4"
      >
        &larr; {copy.groups.hubTitle}
      </Link>

      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
        {copy.profile.editTitle}
      </h1>

      <div className="mt-8">
        <ProfileForm
          userId={account.userId}
          initial={{
            displayName: account.profile.display_name,
            tagline: account.profile.tagline,
            avatarUrl: account.profile.avatar_url,
          }}
        />
      </div>

      <hr className="my-10 border-brine" />

      <h2 className="text-xl font-extrabold tracking-tight">
        {copy.password.title}
      </h2>
      <p className="mt-2 text-sm text-ink-soft">{copy.password.blurb}</p>
      <div className="mt-5">
        <PasswordForm />
      </div>

      <hr className="my-10 border-brine" />

      <h2 className="text-xl font-extrabold tracking-tight">Account</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Signed in as{" "}
        <span className="font-bold text-ink">{account.email ?? "—"}</span>.
      </p>
      <form action="/auth/sign-out" method="post" className="mt-4">
        <Button type="submit" variant="quiet">
          {copy.common.signOut}
        </Button>
      </form>
    </Shell>
  );
}
