import { expect, test } from "@playwright/test";
import { fullnessStage } from "../src/lib/fullness";

/**
 * The fullness stages, checked against the table in PROJECT_SPEC.md
 * section 10 — every boundary, for groups of 5, 20 and 50.
 *
 * If the multipliers in src/lib/fullness.ts are deliberately changed, this
 * table changes with them. If this fails and nobody meant to change them,
 * something is wrong.
 */

const SPEC_TABLE: Array<{ members: number; stages: Array<[number, string]> }> = [
  {
    members: 5,
    stages: [[0, "empty"], [1, "few"], [2, "few"], [3, "half"], [7, "half"],
             [8, "packed"], [14, "packed"], [15, "overflowing"]],
  },
  {
    members: 20,
    stages: [[0, "empty"], [1, "few"], [9, "few"], [10, "half"], [29, "half"],
             [30, "packed"], [59, "packed"], [60, "overflowing"]],
  },
  {
    members: 50,
    stages: [[0, "empty"], [1, "few"], [24, "few"], [25, "half"], [74, "half"],
             [75, "packed"], [149, "packed"], [150, "overflowing"]],
  },
];

for (const { members, stages } of SPEC_TABLE) {
  test(`a group of ${members} matches the spec's fullness table`, () => {
    for (const [pickles, expected] of stages) {
      expect(fullnessStage(pickles, members), `${pickles} pickles`).toBe(expected);
    }
  });
}

test("the very first pickle always moves the jar off empty, even in a tiny group", () => {
  for (const members of [1, 2, 3]) {
    expect(fullnessStage(1, members)).not.toBe("empty");
  }
});

test("a group with no members counted does not break the calculation", () => {
  expect(fullnessStage(0, 0)).toBe("empty");
  expect(fullnessStage(1, 0)).not.toBe("empty");
});
