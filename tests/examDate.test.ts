import { describe, expect, it } from "vitest";
import { examTimestamp } from "../apps/mobile/src/utils/examDate";

describe("exam date input", () => {
  it("combines the selected calendar day and entered local time", () => {
    const result = new Date(examTimestamp(new Date(2026, 8, 30), "14:30"));
    expect([result.getFullYear(), result.getMonth(), result.getDate(), result.getHours(), result.getMinutes()])
      .toEqual([2026, 8, 30, 14, 30]);
  });

  it("rejects invalid hours and minutes", () => {
    expect(() => examTimestamp(new Date(2026, 8, 30), "25:00")).toThrow();
    expect(() => examTimestamp(new Date(2026, 8, 30), "14:99")).toThrow();
  });
});
