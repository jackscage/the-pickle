import Link from "next/link";
import { Jar, Shell } from "@/components/ui";

/**
 * Also the screen someone sees when they open a link to a group they aren't
 * in — "you can't see it" and "it isn't there" deliberately look the same
 * from outside, so a stray link never confirms that a group exists.
 */
export default function NotFound() {
  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <Jar fill={0} className="h-28 w-20" label="An empty pickle jar" />
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
          Nothing here.
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Either this page doesn&rsquo;t exist, or it belongs to a group
          you&rsquo;re not in.
        </p>
        <Link
          href="/groups"
          className="mt-6 font-bold text-pickle underline underline-offset-4"
        >
          Back to your groups
        </Link>
      </div>
    </Shell>
  );
}
