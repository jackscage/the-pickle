import { redirect } from "next/navigation";
import { getAccount, isConfigured } from "@/lib/account";
import { Jar, Shell } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The front door. It doesn't show anything — it works out where you should
 * actually be and sends you there.
 *
 * The one exception is an app deployed without its Supabase keys, which
 * cannot sign anyone in. That gets a real screen saying so, because a
 * redirect loop is a miserable way to find out about a missing setting.
 */
export default async function Home() {
  if (!isConfigured()) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <Jar fill={0} className="h-32 w-24" label="An empty pickle jar" />
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
            Nearly there.
          </h1>
          <p className="mt-3 text-base text-ink-soft">
            The app is deployed, but it hasn&rsquo;t been told where its
            database is. Add{" "}
            <code className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="font-mono text-sm">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            in Vercel&rsquo;s environment variable settings, then redeploy.
          </p>
          <p className="mt-6 text-xs text-ink-faint">
            <a
              href="/api/health"
              className="font-semibold text-pickle underline underline-offset-2"
            >
              /api/health
            </a>{" "}
            reports the same thing in a form a machine can read.
          </p>
        </div>
      </Shell>
    );
  }

  const account = await getAccount();

  if (!account) redirect("/sign-in");
  if (!account.profile) redirect("/welcome");
  redirect("/groups");
}
