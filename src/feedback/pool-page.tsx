import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/account";
import { FEEDBACK_ENABLED } from "./config";
import { feedbackCopy as t } from "./copy";
import { isFeedbackReader, listFeedback, type FeedbackKind } from "./queries";

/**
 * The feedback pool — every report, newest first, with its context.
 *
 * Shown at /feedback through a one-line file in src/app/feedback/ (the
 * module's second touch point). Written to be read by someone who has never
 * used the app: each report says in plain words where the tester was.
 *
 * Anyone who is not a reader, and everyone when the module is switched off,
 * gets the ordinary "page not found" — the screen does not admit to existing.
 */

const KINDS: FeedbackKind[] = ["bug", "suggestion", "confusion"];

const KIND_STYLE: Record<FeedbackKind, string> = {
  bug: "border-alarm text-alarm",
  suggestion: "border-pickle text-pickle",
  confusion: "border-ember text-ember",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export default async function FeedbackPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  if (!FEEDBACK_ENABLED) notFound();
  await requireProfile();
  if (!(await isFeedbackReader())) notFound();

  const { type } = await searchParams;
  const kind = KINDS.find((k) => k === type);
  const items = await listFeedback(kind);

  const filters: Array<{ label: string; href: string; active: boolean }> = [
    { label: t.all, href: "/feedback", active: !kind },
    ...KINDS.map((k) => ({
      label: t.kindShort[k],
      href: `/feedback?type=${k}`,
      active: kind === k,
    })),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.poolTitle}</h1>
      <p className="mt-2 text-base text-ink-soft">{t.poolBlurb}</p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${
              filter.active
                ? "border-pickle bg-pickle text-paper-raised"
                : "border-brine text-ink-soft hover:border-pickle"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="mt-8 text-ink-soft">{t.empty}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              data-testid="feedback-item"
              className="rounded-2xl border-2 border-brine bg-paper-raised px-5 py-4"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span
                  className={`rounded-full border-2 px-2 py-0.5 font-bold uppercase tracking-wide ${KIND_STYLE[item.kind]}`}
                >
                  {t.kindShort[item.kind]}
                </span>
                <span className="text-ink-faint">{formatWhen(item.createdAt)}</span>
              </div>

              <p className="mt-3 whitespace-pre-wrap break-words text-base text-ink">
                {item.message}
              </p>

              <dl className="mt-3 space-y-0.5 text-sm text-ink-soft">
                <div>
                  <dt className="inline font-bold">Screen: </dt>
                  <dd className="inline">
                    {item.screenName}
                    {item.groupName ? ` — ${t.inGroup(item.groupName)}` : ""}
                    {item.jarName ? `, ${t.inJar(item.jarName)}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="sr-only">Sent by</dt>
                  <dd>{t.from(item.reporterName ?? t.someone)}</dd>
                </div>
                <div className="text-xs text-ink-faint">
                  <dt className="sr-only">Address</dt>
                  <dd className="break-all font-mono">{item.screenPath}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
