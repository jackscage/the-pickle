/**
 * Every sentence the Feedback Module says.
 *
 * Kept here rather than in src/lib/copy.ts on purpose: the whole module must
 * delete cleanly with its folder (build brief task 10), so its words live
 * with it.
 */
export const feedbackCopy = {
  button: "Feedback",
  title: "Tell us something",
  blurb: "It goes to the people building this, with the screen you're on.",
  kindLabel: "What kind of thing?",
  kinds: {
    bug: "Something's broken",
    suggestion: "An idea",
    confusion: "Something's confusing",
  },
  kindShort: {
    bug: "Bug",
    suggestion: "Suggestion",
    confusion: "Confusing",
  },
  messageLabel: "What happened?",
  messagePlaceholder: "As much or as little as you like.",
  send: "Send",
  sending: "Sending…",
  close: "Close",
  sent: "Thanks — that's in.",
  sendAnother: "Send another",
  errors: {
    empty: "Write something first.",
    tooLong: "That's over 2,000 characters.",
    signedOut: "You've been signed out. Sign in and try again.",
    failed: "That didn't send. Try again?",
  },

  // The pool screen.
  poolTitle: "Feedback",
  poolBlurb: "Everything testers have sent, newest first.",
  poolLink: "Read feedback",
  all: "All",
  empty: "Nothing here yet.",
  from: (name: string) => `From ${name}`,
  someone: "a tester whose account has since been deleted",
  inGroup: (name: string) => `In “${name}”`,
  inJar: (name: string) => `jar: ${name}`,
} as const;
