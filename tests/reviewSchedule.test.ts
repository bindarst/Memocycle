import { describe, it, expect } from "vitest";
import {
  calculateNextReviewAt,
  CLASSIC_REVIEW_INTERVALS_HOURS as intervals,
  courseInput,
  syncRequestSchema,
} from "../packages/contracts/src";
describe("classic review schedule", () => {
  it("uses actual completion, including late review", () => {
    expect(
      calculateNextReviewAt(
        new Date("2026-09-14T20:00:00Z"),
        0,
        intervals,
      )?.toISOString(),
    ).toBe("2026-09-15T20:00:00.000Z");
    expect(
      calculateNextReviewAt(
        new Date("2026-09-15T20:05:00Z"),
        1,
        intervals,
      )?.toISOString(),
    ).toBe("2026-09-18T20:05:00.000Z");
    expect(
      calculateNextReviewAt(
        new Date("2026-09-19T10:00:00Z"),
        2,
        intervals,
      )?.toISOString(),
    ).toBe("2026-09-26T10:00:00.000Z");
    expect(calculateNextReviewAt(new Date(), 6, intervals)).toBeNull();
  });
  it.each(["Europe/Brussels", "UTC", "America/New_York", "Asia/Tokyo"])(
    "keeps real durations across DST in %s",
    (zone) => {
      for (const instant of [
        "2026-03-28T20:00:00Z",
        "2026-10-24T20:00:00Z",
        "2026-03-07T20:00:00Z",
        "2026-10-31T20:00:00Z",
      ]) {
        const start = new Date(instant);
        const next = calculateNextReviewAt(start, 0, intervals)!;
        expect(next.getTime() - start.getTime()).toBe(86400000);
        expect(
          new Intl.DateTimeFormat("fr", { timeZone: zone }).format(next),
        ).toBeTruthy();
      }
    },
  );
  it("rejects invalid dates, steps and intervals", () => {
    for (const step of [-1, 0.5, 7, NaN])
      expect(() =>
        calculateNextReviewAt(new Date(), step, intervals),
      ).toThrow();
    expect(() =>
      calculateNextReviewAt(new Date("invalid"), 0, intervals),
    ).toThrow();
    expect(() => calculateNextReviewAt(new Date(), 0, [0])).toThrow();
  });
  it("validates network contracts without trusting userId or status", () => {
    expect(
      courseInput.safeParse({ title: "", subjectId: "bad", importance: 4 })
        .success,
    ).toBe(false);
    expect(
      syncRequestSchema.safeParse({
        cursor: "0",
        mutations: [],
        userId: "other",
      }).success,
    ).toBe(false);
  });
});
