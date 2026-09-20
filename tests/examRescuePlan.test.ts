import { describe, expect, it } from "vitest";
import { buildExamRescuePlan } from "../apps/mobile/src/planning/examRescuePlan";

const now = Date.parse("2026-09-20T10:00:00.000Z");
const base = { ownerUserId: "u", version: 1, updatedAt: new Date(now).toISOString(), deletedAt: null };

describe("exam rescue plan", () => {
  it("prioritizes an unplanned course and respects the daily budget", () => {
    const exam = { ...base, id: "exam", title: "Final", subjectId: "s", moduleId: null, examAt: "2026-09-25T10:00:00.000Z", notes: null } as never;
    const courses = [
      { ...base, id: "new", title: "Nouveau", subjectId: "s", moduleId: null, archivedAt: null, estimatedReviewMinutes: 20 },
      { ...base, id: "other", title: "Autre", subjectId: "x", moduleId: null, archivedAt: null, estimatedReviewMinutes: 20 },
    ] as never;
    const result = buildExamRescuePlan(exam, courses, [], 15, now);
    expect(result.daysLeft).toBe(5);
    expect(result.missions.map((item) => item.course.id)).toEqual(["new"]);
    expect(result.missions[0]?.minutes).toBe(15);
    expect(result.readiness).toBe(35);
  });
});
