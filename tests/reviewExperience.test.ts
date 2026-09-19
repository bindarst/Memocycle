import { describe, expect, it } from "vitest";
import {
  formatSessionDuration,
  reviewSessionScore,
} from "../apps/mobile/src/review/reviewExperience";

describe("review experience", () => {
  it("calculates a readable mastery score from all four ratings", () => {
    expect(reviewSessionScore(["again", "hard", "good", "easy"])).toBe(56);
    expect(reviewSessionScore(["good", "good", "easy"])).toBe(87);
    expect(reviewSessionScore([])).toBe(0);
  });

  it("formats short and longer session durations", () => {
    expect(formatSessionDuration(42)).toBe("42 s");
    expect(formatSessionDuration(125)).toBe("2 min 05");
  });
});
