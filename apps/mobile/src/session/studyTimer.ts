export type StudyTimer = {
  mode: "focus" | "chronometer";
  focusMinutes: number;
  elapsedMs: number;
  runningSinceMs: number | null;
};

export type TimerAction =
  | { type: "toggle" }
  | { type: "reset" }
  | { type: "mode" }
  | { type: "duration"; minutes: number };

export const defaultStudyTimer = (): StudyTimer => ({
  mode: "focus",
  focusMinutes: 25,
  elapsedMs: 0,
  runningSinceMs: null,
});

export function timerSnapshot(timer: StudyTimer, now: number) {
  const elapsedMs = Math.max(
    0,
    timer.elapsedMs + (timer.runningSinceMs === null ? 0 : Math.max(0, now - timer.runningSinceMs)),
  );
  const limitMs = timer.focusMinutes * 60_000;
  const finished = timer.mode === "focus" && elapsedMs >= limitMs;
  return {
    elapsedMs: timer.mode === "focus" ? Math.min(elapsedMs, limitMs) : elapsedMs,
    remainingSeconds: Math.max(0, Math.ceil((limitMs - elapsedMs) / 1000)),
    running: timer.runningSinceMs !== null && !finished,
    finished,
    progress: timer.mode === "focus" ? Math.min(1, elapsedMs / limitMs) : 0,
  };
}

export function transitionTimer(timer: StudyTimer, action: TimerAction, now: number): StudyTimer {
  const snapshot = timerSnapshot(timer, now);
  if (action.type === "reset") return { ...timer, elapsedMs: 0, runningSinceMs: null };
  if (action.type === "mode") {
    return { ...timer, mode: timer.mode === "focus" ? "chronometer" : "focus", elapsedMs: 0, runningSinceMs: null };
  }
  if (action.type === "duration") {
    return { ...timer, focusMinutes: action.minutes, elapsedMs: 0, runningSinceMs: null };
  }
  if (snapshot.running) {
    return { ...timer, elapsedMs: snapshot.elapsedMs, runningSinceMs: null };
  }
  return {
    ...timer,
    elapsedMs: snapshot.finished ? 0 : snapshot.elapsedMs,
    runningSinceMs: now,
  };
}
