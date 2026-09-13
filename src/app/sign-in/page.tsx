import { redirect } from "next/navigation";
import { getAccount, isConfigured } from "@/lib/account";
import { copy } from "@/lib/copy";
import { Jar, Shell } from "@/components/ui";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Only ever redirect to a path inside this app, never to a URL someone has
  // put in the address bar. An open redirect on a sign-in page is how
  // phishing links get made.
  const raw = params.next ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (isConfigured()) {
    const account = await getAccount();
    if (account) redirect(next);
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <Jar fill={22} className="h-32 w-24" label="A pickle jar, part full" />
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight">
          {copy.signIn.title}
        </h1>
        <p className="mt-3 max-w-xs text-base text-ink-soft">
          {copy.signIn.blurb}
        </p>
      </div>

      <div className="mt-10">
        <SignInForm next={next} expired={params.error === "expired"} />
      </div>

      <p className="mt-10 text-center text-xs text-ink-faint">
        We only ever use your email to sign you in. Your real name is never
        required — you pick what everyone sees.
      </p>
    </Shell>
  );
}
