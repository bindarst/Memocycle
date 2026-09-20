import { describe, expect, it } from "vitest";
import { buildWeeklyReport } from "../apps/mobile/src/stats/weeklyReport";

describe("weekly report", () => {
  it("compares the current week with the previous one", () => {
    const now = Date.parse("2026-09-20T10:00:00.000Z");
    const events = [
      { completedAt: new Date(now - 86_400_000).toISOString(), confidence: "good", durationSeconds: 600, courseId: "c" },
      { completedAt: new Date(now - 2 * 86_400_000).toISOString(), confidence: "easy", durationSeconds: 300, courseId: "c" },
      { completedAt: new Date(now - 9 * 86_400_000).toISOString(), confidence: "again", durationSeconds: 300, courseId: "c" },
    ] as never;
    const report = buildWeeklyReport(events, [], [], now);
    expect(report.reviews).toBe(2);
    expect(report.minutes).toBe(15);
    expect(report.successRate).toBe(100);
    expect(report.delta).toBe(1);
  });
});
