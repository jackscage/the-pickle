import { getAccount } from "@/lib/account";
import { FEEDBACK_ENABLED } from "./config";
import { isFeedbackReader } from "./queries";
import { FeedbackWidget } from "./feedback-widget";

/**
 * The feedback button, shown in the corner of every screen.
 *
 * Rendered once, from the app layout — one of the module's only two touch
 * points outside this folder. Shows nothing at all when the module is
 * switched off, or to anyone not signed in with a finished profile.
 */
export async function FeedbackButton() {
  if (!FEEDBACK_ENABLED) return null;

  const account = await getAccount();
  if (!account?.profile) return null;

  return <FeedbackWidget isReader={await isFeedbackReader()} />;
}
