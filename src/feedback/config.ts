/**
 * The Feedback Module's one switch.
 *
 * Every piece of the feature — the button on each screen, and the pool
 * screen — checks this and shows nothing when it is false.
 *
 * Off unless NEXT_PUBLIC_FEEDBACK_ENABLED is set to exactly "true" (in
 * Vercel's environment variables for the live site, or .env.local on your
 * own computer). Off is the safe default: the feature can never appear by
 * accident, only on purpose.
 */
export const FEEDBACK_ENABLED = process.env.NEXT_PUBLIC_FEEDBACK_ENABLED === "true";
