import { describe, expect, it } from "vitest";
import type { Plan } from "../apps/mobile/src/database/entities";
import {
  averageRetention,
  retentionAt,
  stabilityMs,
} from "../apps/mobile/src/review/memoryModel";

const hour = 3_600_000;
const startedAt = new Date("2026-09-01T08:00:00.000Z");

function plan(intervalHours: number): Plan {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    userId: "10000000-0000-4000-8000-000000000002",
    version: 1,
    updatedAt: startedAt.toISOString(),
    deletedAt: null,
    courseId: "10000000-0000-4000-8000-000000000003",
    currentStep: 1,
    intervalsJson: [24, 72, 168, 336, 720, 1440],
    scheduleVersion: 1,
    nextReviewAt: new Date(startedAt.getTime() + intervalHours * hour).toISOString(),
    startedAt: startedAt.toISOString(),
    lastReviewedAt: null,
    completedAt: null,
    status: "active",
  };
}

describe("memory retention model", () => {
  it("uses the active review interval as 90% stability", () => {
    const item = plan(24);
    expect(stabilityMs(item)).toBe(24 * hour);
    expect(retentionAt(item, startedAt.getTime())).toBe(1);
    expect(retentionAt(item, startedAt.getTime() + 24 * hour)).toBeCloseTo(0.9);
  });

  it("aggregates active courses and ignores completed plans", () => {
    const active = plan(24);
    const completed = { ...plan(72), status: "completed" };
    const at = startedAt.getTime() + 24 * hour;
    expect(averageRetention([active, completed], at)).toBeCloseTo(0.9);
  });
});
