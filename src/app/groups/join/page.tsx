import Link from "next/link";
import { requireProfile } from "@/lib/account";
import { copy } from "@/lib/copy";
import { Shell } from "@/components/ui";
import { JoinGroupForm } from "../group-forms";

export const dynamic = "force-dynamic";

export default async function JoinGroupPage() {
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
        {copy.groups.joinTitle}
      </h1>
      <p className="mt-3 text-base text-ink-soft">{copy.groups.joinBlurb}</p>

      <div className="mt-8">
        <JoinGroupForm />
      </div>
    </Shell>
  );
}
