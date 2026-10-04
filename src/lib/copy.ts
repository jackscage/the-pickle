/**
 * Every sentence the app says to a person, in one file.
 *
 * Why it lives here rather than inline in the screens: PROJECT_SPEC.md
 * section 17a describes a later Design Stage where the wording and the
 * personality get reworked with playtester input. Keeping copy out of the
 * logic means that stage is a pass over this one file, not a hunt through
 * thirty components.
 *
 * Section 20 asks for error and empty states written in-voice rather than as
 * generic system messages. That is what most of this is.
 */

export const copy = {
  /** The product's own vocabulary (spec section 3). Never "post" or "feed". */
  terms: {
    group: "Pickle Group",
    code: "Pickle Code",
    submission: "Pickle",
    round: "Jar",
    archive: "Past Jars",
    submit: "Put It In The Pickle",
    open: "Open The Jar",
    seal: "Seal the Jar",
    roster: "The Roster",
  },

  signIn: {
    title: "The Pickle",
    blurb:
      "A jar that fills up, gets sealed, and opens all at once. For your people only.",
    emailLabel: "Your email",
    sendLink: "Send me a link",
    sending: "Sending…",
    usePassword: "I have a password",
    useLink: "Email me a link instead",
    passwordLabel: "Password",
    signInWithPassword: "Sign in",
    linkSent:
      "Check your email. The link signs you straight in — it expires in an hour.",
    linkSentAgain: "Sent another one.",
    resend: "Send it again",
    wrongPassword: "That email and password don't match. Try a link instead?",
    noAccountForPassword:
      "No password set for that email yet. Use the link, then you can add one in settings.",
    linkExpired:
      "That link has expired. Here's a fresh one — no need to start over.",
    genericError: "Something went wrong sending that. Try again?",

    // Three specific failures that were all showing genericError, which cost
    // real debugging time. Each has a different fix, so each says something
    // different. The technical detail for whoever maintains the app goes to
    // the server log (see describeSendFailure), never onto the screen: the
    // product does not name its vendors or explain its own plumbing.
    rateLimited:
      "That's a lot of sign-in emails in a short time. Wait a few minutes, " +
      "or sign in with a password if you've set one.",
    redirectNotAllowed:
      "Sign-in links can't be sent from this address. Try again from the " +
      "app's usual address.",
    mailFailed:
      "The email wouldn't send. That's the mail service rather than your " +
      "account — try again in a minute.",
  },

  profile: {
    setupTitle: "What should everyone call you?",
    setupBlurb:
      "This is the name on your comments and on anything you choose to put your name to. You can change it whenever you like.",
    editTitle: "Your profile",
    displayNameLabel: "Display name",
    displayNamePlaceholder: "Whatever your friends call you",
    taglineLabel: "Tagline",
    taglineHint: "Optional. 60 characters. Shows next to your name on the roster.",
    taglinePlaceholder: "Something true or something stupid",
    pictureLabel: "Picture",
    pictureHint: "Optional. A square-ish image works best.",
    pictureChoose: "Choose a picture",
    pictureRemove: "Remove picture",
    save: "Save",
    saving: "Saving…",
    saved: "Saved.",
    skip: "Skip for now",
    nameRequired: "You'll need a name of some kind.",
    nameTooLong: "That's a bit long — 40 characters or fewer.",
    taglineTooLong: "Taglines cap out at 60 characters.",
    pictureTooBig: "That picture's over 5 MB. Try a smaller one.",
    pictureWrongType: "That doesn't look like an image file.",
    pictureFailed: "The picture wouldn't upload. Your other changes are saved.",
  },

  password: {
    title: "Password",
    blurb:
      "Optional. An email link always works, but a password saves you leaving the app to fetch one. You can set or change it here any time.",
    newLabel: "New password",
    confirmLabel: "Confirm it",
    set: "Set password",
    change: "Change password",
    tooShort: "Passwords need at least 8 characters.",
    mismatch: "Those two don't match.",
    done: "Password set. Either way of signing in works from now on.",
  },

  groups: {
    hubTitle: "Your Pickle Groups",
    hubEmpty: "You're not in a group yet. Join one with a code, or start one.",
    join: "Join with a code",
    create: "Start a group",
    createTitle: "Start a Pickle Group",
    createBlurb:
      "You'll get a code to share. Anyone with it can join, up to 75 people.",
    nameLabel: "What's the group called?",
    namePlaceholder: "Camp staff, the group chat, etc.",
    createButton: "Make the group",
    creating: "Making it…",
    createAdminNote:
      "You'll be the group's admin, which means you decide when a jar gets " +
      "sealed and opened. You can hand that to other people later.",
    joinTitle: "Join a Pickle Group",
    joinBlurb: "Someone in the group will have the code.",
    codeLabel: "Pickle Code",
    joinButton: "Join",
    joining: "Joining…",
    codeCopied: "Copied.",
    copyCode: "Copy code",
    memberCount: (n: number) => (n === 1 ? "1 member" : `${n} members`),
    admin: "Admin",
    you: "You",
    leave: "Leave group",
    leaveConfirm:
      "Leave this group? Anything you've already put in a jar stays there, still anonymous.",
    regenerate: "Make a new code",
    regenerateConfirm:
      "The old code stops working immediately. Anyone still using it won't be able to join.",
  },

  /**
   * Errors the database raises, translated. The database sends short tokens
   * (BAD_CODE, FULL) precisely so that the sentence a person reads can be
   * rewritten here without a migration.
   */
  groupErrors: {
    BAD_CODE: "No group with that code. Worth checking for a typo.",
    LOCKED: "This group is locked — it isn't taking new people right now.",
    FULL: "This group's at capacity.",
    NO_PROFILE: "Set up your profile first, then you can join.",
    NO_NAME: "The group needs a name.",
    NOT_SIGNED_IN: "You've been signed out. Sign in and try again.",
    NOT_A_MEMBER: "You're not in that group.",
    NOT_ADMIN: "Only an admin can do that.",
    LAST_ADMIN:
      "You're the only admin. Make someone else an admin first, then you can leave.",
    BAD_JAR_START_MODE: "Pick how new jars should start.",

    // Jar rules (migration 0002).
    JAR_ALREADY_CURRENT: "There's already a jar going. Open that one first.",
    JAR_NOT_FOUND: "That jar isn't here any more.",
    JAR_NOT_ACCEPTING: "That jar's already sealed.",
    JAR_ALREADY_OPENED: "That jar's already been opened.",

    // Putting pickles in (migration 0003).
    EMPTY_PICKLE: "Write something first.",
    PICKLE_TOO_LONG: "That's over 1,200 characters. Trim it a little.",
    SLOW_DOWN: "That's a lot of pickles in a few minutes. Take a breather and try again shortly.",

    UNKNOWN: "That didn't work. Try again?",
  } as const,

  roster: {
    title: "The Roster",
    blurb: "Everyone in the group.",
    /**
     * Spec section 15a. This line is load-bearing — it is the app explaining
     * its own most counter-intuitive rule, so people don't assume it's a bug.
     */
    note: "Who's in the group is public. What anyone's put in the jar is not.",
    empty: "Just you so far. Share the code.",
  },

  jar: {
    currentLabel: "The Current Jar",
    emptyCurrent: "The jar's empty. Be the first to put something in.",
    emptyArchive: "No jars opened yet. History starts with your first one.",
    loading: "Fermenting…",

    /**
     * The five fullness stages (spec section 10). Shown instead of a count —
     * a jar is "half full", never "12 pickles".
     */
    stages: {
      empty: "Empty",
      few: "A few pickles",
      half: "Half full",
      packed: "Packed",
      overflowing: "Overflowing",
    },
    stageLabel: (stage: string) => `A pickle jar: ${stage.toLowerCase()}`,

    accepting: "Open for pickles.",
    sealed: "Sealed. Nothing more goes in. It opens when an admin says so.",

    // No current jar.
    noneTitle: "No jar right now.",
    noneMember: "An admin starts the next one.",
    noneAdmin: "Start the next one whenever the group's ready.",
    start: "Start a new jar",
    starting: "Starting…",

    // Naming (optional).
    nameLabel: "Name it (optional)",
    namePlaceholder: "Lake weekend, end of term, etc.",
    rename: "Rename",
    renameSave: "Save name",

    // Admin controls.
    adminTitle: "Admin",
    sealExplain: "Stops new pickles without opening it. Optional.",
    openConfirm: "Once opened, the Pickle cannot be resealed.",
    openYes: "Yes, open it",

    // Past Jars.
    pastLink: "Past Jars",
    pastTitle: "Past Jars",
    openedOn: (date: string) => `Opened ${date}`,
    nobodyPutAnything: "Nobody put anything in this time.",
  },

  /** Writing a pickle and putting it in (spec section 7, "Submit a Pickle"). */
  pickle: {
    writeTitle: "Put It In The Pickle",
    writeBlurb: "Nobody will know it was you unless you tell them.",
    textLabel: "Your pickle",
    textPlaceholder: "A joke, a note, a confession…",
    charactersLeft: (n: number) => (n === 1 ? "1 character left" : `${n} characters left`),
    tooLongBy: (n: number) => `${n} over`,
    preview: "Preview",
    keepEditing: "Keep editing",
    previewNote: "This is how it'll look when the jar opens.",
    putItIn: "Put it in",
    puttingIn: "Putting it in…",
    done: "Your pickle is in the jar.",
    putAnother: "Put another in",
    // Once a jar is opened.
    anonymous: "Anonymous",
    youWroteThis: "You wrote this",
  },

  /** How a group's next jar begins (a group setting, chosen at creation). */
  jarStartMode: {
    title: "How new jars start",
    admin: "An admin starts each jar",
    adminHint: "After a jar is opened, the group waits until an admin starts the next.",
    automatic: "Automatically",
    automaticHint: "A fresh jar starts the moment the last one is opened.",
    save: "Save",
    saved: "Saved.",
  },

  common: {
    signOut: "Sign out",
    settings: "Settings",
    back: "Back",
    cancel: "Cancel",
    groupSettingsTitle: "Group settings",
    somethingWrong: "Something went wrong. Try that again?",
  },
} as const;

export type GroupErrorKey = keyof typeof copy.groupErrors;

/**
 * Find which known error a database error (or a token on its own) is.
 *
 * Screens pass this short key around in the address bar — `?error=NOT_ADMIN`
 * — rather than the sentence itself, so a crafted link can only ever make a
 * screen show one of the messages above, never words of someone's choosing.
 */
export function groupErrorKey(raw: unknown): GroupErrorKey {
  const text =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object" && "message" in raw
        ? String((raw as { message: unknown }).message)
        : "";

  const keys = Object.keys(copy.groupErrors) as GroupErrorKey[];
  return keys.find((key) => text.includes(key)) ?? "UNKNOWN";
}

/** Turn a database error, or an error key, into a sentence. */
export function groupErrorMessage(raw: unknown): string {
  return copy.groupErrors[groupErrorKey(raw)];
}
