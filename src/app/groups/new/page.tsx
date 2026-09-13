import Link from "next/link";
import { requireProfile } from "@/lib/account";
import { copy } from "@/lib/copy";
import { Shell } from "@/components/ui";
import { CreateGroupForm } from "../group-forms";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  await requireProfile();

  return (
    <Shell>
      <Link
        href="/groups"
        className="text-sm font-bold text-pickle underline underline-offset-4"
      >
        &larr; {copy.common.back}
      </Link>

      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
        {copy.groups.createTitle}
      </h1>
      <p className="mt-3 text-base text-ink-soft">{copy.groups.createBlurb}</p>

      <div className="mt-8">
        <CreateGroupForm />
      </div>

      <p className="mt-8 text-sm text-ink-faint">
        You&rsquo;ll be the group&rsquo;s admin, which means you decide when a
        jar gets sealed and opened. You can hand that to other people later.
      </p>
    </Shell>
  );
}
