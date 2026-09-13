import { redirect } from "next/navigation";
import { getAccount } from "@/lib/account";
import { copy } from "@/lib/copy";
import { Shell } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

/**
 * The one screen between signing in for the first time and being in the app.
 *
 * Only the display name is required. The picture and tagline are skippable
 * here and available for ever afterwards in settings — section 7 of the spec
 * is explicit that this step should not become a form to fill in.
 */
export default async function WelcomePage() {
  const account = await getAccount();
  if (!account) redirect("/sign-in");
  if (account.profile) redirect("/groups");

  return (
    <Shell>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-pickle">
        Welcome in
      </p>
      <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">
        {copy.profile.setupTitle}
      </h1>
      <p className="mt-3 text-base text-ink-soft">{copy.profile.setupBlurb}</p>

      <p className="mt-4 rounded-xl border-2 border-brine bg-paper-raised px-4 py-3 text-sm text-ink-soft">
        Your name shows on the roster and on your comments. It does{" "}
        <span className="font-bold text-ink">not</span> show on anything you put
        in a jar — unless you decide later that it should.
      </p>

      <div className="mt-8">
        <ProfileForm
          userId={account.userId}
          initial={{ displayName: "", tagline: null, avatarUrl: null }}
          redirectTo="/groups"
          submitLabel="That's me"
        />
      </div>
    </Shell>
  );
}
