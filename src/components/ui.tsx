import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * The small set of shapes the whole app is built from.
 *
 * Kept deliberately plain. PROJECT_SPEC.md section 17a describes a Design
 * Stage where the look is reworked with playtester input, and section 17 asks
 * that artwork and styling stay separable from behaviour. So these are
 * honest, legible defaults — paper, brine, a bit of ink — and nothing here is
 * clever enough to be painful to replace.
 */

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base " +
  "font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ember text-paper-raised hover:bg-ember/90",
  secondary:
    "border-2 border-pickle bg-transparent text-pickle hover:bg-pickle/10",
  quiet: "text-ink-soft hover:text-ink hover:bg-ink/5",
  danger: "border-2 border-alarm bg-transparent text-alarm hover:bg-alarm/10",
};

export function buttonClass(variant: ButtonVariant = "primary"): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-xs text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border-2 border-brine bg-paper-raised px-4 py-3 text-base " +
  "text-ink placeholder:text-ink-faint focus:border-pickle focus:outline-none";

/** An error a person needs to read and act on. Never a raw system message. */
export function Notice({
  tone = "bad",
  children,
}: {
  tone?: "bad" | "good";
  children: ReactNode;
}) {
  if (!children) return null;
  const styles =
    tone === "good"
      ? "border-pickle-bright bg-pickle-bright/10 text-pickle-deep"
      : "border-alarm bg-alarm/10 text-alarm";
  return (
    <p
      role="status"
      className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold ${styles}`}
    >
      {children}
    </p>
  );
}

/** A person's picture, or their initial on a brine circle. */
export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (url) {
    // A plain <img>: these come from Supabase storage at unpredictable URLs,
    // and next/image would need every one of them declared up front.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="flex-none rounded-full border-2 border-brine object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="flex flex-none items-center justify-center rounded-full border-2 border-brine bg-brine-pale font-extrabold text-pickle-deep"
    >
      {initial}
    </span>
  );
}

/**
 * The jar.
 *
 * Simple drawn shapes, exactly as section 17 asks for at this stage —
 * designed artwork with many more intermediate stages is a Design Stage job.
 * `fill` is 0–100 so that whatever replaces this can take the same input.
 */
export function Jar({
  fill = 0,
  className = "h-40 w-32",
  label = "A pickle jar",
}: {
  fill?: number;
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, fill));
  const body =
    "M22 38 h76 a10 10 0 0 1 10 10 v82 a10 10 0 0 1 -10 10 h-76 a10 10 0 0 1 -10 -10 v-82 a10 10 0 0 1 10 -10 z";

  // The brine is drawn as its own shape rather than clipped to the jar. The
  // obvious way to do this is an SVG <clipPath>, but a clipPath needs an id,
  // ids have to be unique across the whole page, and the groups list renders
  // one of these per group — so the second jar onwards would have clipped
  // itself against the first. Drawing the shape directly has no such problem.
  const surface = clamped === 0 ? null : 138 - Math.max(14, (clamped / 100) * 98);

  return (
    <svg viewBox="0 0 120 150" className={className} role="img" aria-label={label}>
      {surface === null ? null : (
        <path
          d={`M14 ${surface} H106 V128 a10 10 0 0 1 -10 10 H24 a10 10 0 0 1 -10 -10 Z`}
          fill="#B4BD87"
        />
      )}
      <path d={body} fill="none" stroke="#3E5641" strokeWidth="4" />
      <rect x="34" y="24" width="52" height="14" fill="none" stroke="#3E5641" strokeWidth="4" />
      <rect x="28" y="12" width="64" height="14" rx="4" fill="#3E5641" />
      <rect x="26" y="52" width="6" height="50" rx="3" fill="#FBF8EE" opacity="0.55" />
    </svg>
  );
}

/** The narrow, centred column most screens live in. */
export function Shell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main
      className={`mx-auto w-full px-5 py-10 ${wide ? "max-w-5xl" : "max-w-md"}`}
    >
      {children}
    </main>
  );
}
