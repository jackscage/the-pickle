/**
 * How full is the jar?
 *
 * PROJECT_SPEC.md section 10. Fullness is shown as one of five stages, never
 * as a prominent number, and the stages scale with the size of the group:
 * roughly one pickle per person is "half full" whether the group is 5 people
 * or 50.
 *
 * This is a pure calculation — two numbers in, a stage out, nothing else
 * consulted. Fullness always means fullness: no kind of jar makes it mean
 * anything else (an earlier spec version had timed jars show a countdown
 * here instead; that idea was dropped).
 */

/**
 * THE TUNABLE NUMBERS — a guess awaiting human judgement.
 *
 * Each is "pickles per member" at which the jar moves up a stage. Claude
 * picked these, not the owner; the owner asked for a reasonable first draft
 * to be revisited once a real group has played. Change them here and
 * nowhere else.
 *
 *   below HALF_FULL_AT   x members  -> "a few"
 *   below PACKED_AT      x members  -> "half full"
 *   below OVERFLOWING_AT x members  -> "packed"
 *   from  OVERFLOWING_AT x members  -> "overflowing"
 */
export const FULLNESS_MULTIPLIERS = {
  HALF_FULL_AT: 0.5,
  PACKED_AT: 1.5,
  OVERFLOWING_AT: 3,
} as const;

export type FullnessStage = "empty" | "few" | "half" | "packed" | "overflowing";

export function fullnessStage(pickleCount: number, memberCount: number): FullnessStage {
  // A group always has at least one member (whoever is looking), so never
  // divide the jar up among zero people.
  const members = Math.max(1, memberCount);

  // Any pickle at all moves the jar off "empty", so even a group of three
  // sees it respond to the very first thing put in.
  if (pickleCount <= 0) return "empty";
  if (pickleCount < members * FULLNESS_MULTIPLIERS.HALF_FULL_AT) return "few";
  if (pickleCount < members * FULLNESS_MULTIPLIERS.PACKED_AT) return "half";
  if (pickleCount < members * FULLNESS_MULTIPLIERS.OVERFLOWING_AT) return "packed";
  return "overflowing";
}

/**
 * How high to draw the brine in the jar picture for each stage, 0 to 100.
 *
 * Artwork, not logic: the Design Stage (spec section 17a) is expected to
 * replace the drawing entirely, possibly with many more steps. The stages
 * above stay the same when it does.
 */
export const STAGE_FILL: Record<FullnessStage, number> = {
  empty: 0,
  few: 22,
  half: 50,
  packed: 78,
  overflowing: 100,
};
