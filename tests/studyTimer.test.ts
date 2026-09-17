import { describe, expect, it } from "vitest";
import { defaultStudyTimer, timerSnapshot, transitionTimer } from "../apps/mobile/src/session/studyTimer";

describe("study timer", () => {
  it("continues from wall-clock time after leaving and reopening", () => {
    const started = transitionTimer(defaultStudyTimer(), { type: "toggle" }, 10_000);
    expect(timerSnapshot(started, 70_000).remainingSeconds).toBe(1440);
    const paused = transitionTimer(started, { type: "toggle" }, 70_000);
    expect(timerSnapshot(paused, 600_000).remainingSeconds).toBe(1440);
    const resumed = transitionTimer(paused, { type: "toggle" }, 600_000);
    expect(timerSnapshot(resumed, 660_000).remainingSeconds).toBe(1380);
  });

  it("ends Focus at zero after a long suspension and starts a fresh cycle", () => {
    const started = transitionTimer(defaultStudyTimer(), { type: "toggle" }, 10_000);
    expect(timerSnapshot(started, 2_000_000)).toMatchObject({ remainingSeconds: 0, running: false, finished: true });
    const restarted = transitionTimer(started, { type: "toggle" }, 2_000_000);
    expect(timerSnapshot(restarted, 2_000_000)).toMatchObject({ remainingSeconds: 1500, running: true });
  });

  it("keeps the free chronometer running without an upper bound", () => {
    const free = transitionTimer(defaultStudyTimer(), { type: "mode" }, 0);
    const started = transitionTimer(free, { type: "toggle" }, 1000);
    expect(timerSnapshot(started, 3_601_000)).toMatchObject({ elapsedMs: 3_600_000, running: true });
  });
});
