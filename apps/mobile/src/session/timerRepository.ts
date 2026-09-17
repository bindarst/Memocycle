import { database } from "../database/database";
import { defaultStudyTimer, type StudyTimer } from "./studyTimer";

type TimerRow = {
  mode: StudyTimer["mode"];
  focus_minutes: number;
  elapsed_ms: number;
  running_since_ms: number | null;
};

export async function loadStudyTimer(userId: string, courseId: string): Promise<StudyTimer> {
  const db = await database();
  const row = await db.getFirstAsync<TimerRow>(
    "SELECT mode, focus_minutes, elapsed_ms, running_since_ms FROM study_timers WHERE owner_user_id=? AND course_id=?",
    userId,
    courseId,
  );
  return row
    ? {
        mode: row.mode,
        focusMinutes: row.focus_minutes,
        elapsedMs: row.elapsed_ms,
        runningSinceMs: row.running_since_ms,
      }
    : defaultStudyTimer();
}

export async function saveStudyTimer(userId: string, courseId: string, timer: StudyTimer) {
  const db = await database();
  await db.runAsync(
    `INSERT INTO study_timers (owner_user_id,course_id,mode,focus_minutes,elapsed_ms,running_since_ms)
     VALUES (?,?,?,?,?,?) ON CONFLICT(owner_user_id,course_id) DO UPDATE SET
     mode=excluded.mode,focus_minutes=excluded.focus_minutes,
     elapsed_ms=excluded.elapsed_ms,running_since_ms=excluded.running_since_ms`,
    userId,
    courseId,
    timer.mode,
    timer.focusMinutes,
    timer.elapsedMs,
    timer.runningSinceMs,
  );
}

export async function clearStudyTimer(userId: string, courseId: string) {
  const db = await database();
  await db.runAsync(
    "DELETE FROM study_timers WHERE owner_user_id=? AND course_id=?",
    userId,
    courseId,
  );
}
