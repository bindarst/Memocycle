import { describe, it, expect } from "vitest";
import {
  calculateNextReviewAt,
  calculateAdaptiveReview,
  calculateRetrievability,
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

describe("adaptive FSRS review engine", () => {
  const t0 = new Date("2026-09-01T10:00:00.000Z");

  it("'again' produces an earlier review than 'good'", () => {
    const again = calculateAdaptiveReview({ completedAt: t0, rating: "again" });
    const good = calculateAdaptiveReview({ completedAt: t0, rating: "good" });

    expect(again.nextReviewAt.getTime()).toBeLessThan(good.nextReviewAt.getTime());
    expect(again.memoryState.scheduledDays).toBeLessThan(good.memoryState.scheduledDays);
  });

  it("'hard' produces an earlier review than 'easy'", () => {
    const hard = calculateAdaptiveReview({ completedAt: t0, rating: "hard" });
    const easy = calculateAdaptiveReview({ completedAt: t0, rating: "easy" });

    expect(hard.nextReviewAt.getTime()).toBeLessThan(easy.nextReviewAt.getTime());
    expect(hard.memoryState.scheduledDays).toBeLessThan(easy.memoryState.scheduledDays);
  });

  it("increases stability after successful recall reviews", () => {
    const first = calculateAdaptiveReview({ completedAt: t0, rating: "good" });
    const t1 = first.nextReviewAt;
    const second = calculateAdaptiveReview({
      completedAt: t1,
      rating: "good",
      previousState: first.memoryState,
    });

    expect(second.memoryState.stability).toBeGreaterThan(first.memoryState.stability);
    expect(second.memoryState.reps).toBe(2);
    expect(second.memoryState.lapses).toBe(0);
  });

  it("increases lapses count after forgetting ('again')", () => {
    const first = calculateAdaptiveReview({ completedAt: t0, rating: "good" });
    const t1 = first.nextReviewAt;
    const second = calculateAdaptiveReview({
      completedAt: t1,
      rating: "again",
      previousState: first.memoryState,
    });

    expect(second.memoryState.lapses).toBe(1);
    expect(second.memoryState.reps).toBe(2);
    expect(second.memoryState.stability).toBeLessThan(first.memoryState.stability);
  });

  it("target retention influences review interval", () => {
    const highRetention = calculateAdaptiveReview({
      completedAt: t0,
      rating: "good",
      desiredRetention: 0.95,
    });
    const lowRetention = calculateAdaptiveReview({
      completedAt: t0,
      rating: "good",
      desiredRetention: 0.85,
    });

    expect(highRetention.nextReviewAt.getTime()).toBeLessThan(
      lowRetention.nextReviewAt.getTime(),
    );
  });

  it("calculates retrievability correctly over elapsed time", () => {
    const first = calculateAdaptiveReview({ completedAt: t0, rating: "good" });
    const rAtStart = calculateRetrievability(first.memoryState.stability, 0);
    const rAtDue = calculateRetrievability(
      first.memoryState.stability,
      first.memoryState.scheduledDays,
    );

    expect(rAtStart).toBe(1);
    expect(rAtDue).toBeCloseTo(0.9, 1);
    expect(rAtDue).toBeLessThan(rAtStart);
  });
});

