import { addDays, startOfDay } from "date-fns";
import type { ReviewEvent } from "../database/entities";
import { dayKey } from "./dates";

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  activeDaysCount: number;
  isTodayActive: boolean;
}

export function calculateStreaks(
  events: ReviewEvent[],
  now = Date.now(),
): StreakStats {
  const completedEvents = events.filter(
    (e) => e.kind === "review_completed" || e.kind === "review_started",
  );

  const activeDays = new Set(
    completedEvents.map((e) => dayKey(new Date(e.completedAt))),
  );

  const todayKey = dayKey(new Date(now));
  const isTodayActive = activeDays.has(todayKey);

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = isTodayActive ? new Date(now) : addDays(new Date(now), -1);

  while (activeDays.has(dayKey(checkDate))) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  // Calculate longest streak across all history
  const sortedDays = Array.from(activeDays).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate: Date | null = null;

  for (const dayStr of sortedDays) {
    const curDate = startOfDay(new Date(`${dayStr}T12:00:00`));
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diffDays = Math.round(
        (curDate.getTime() - prevDate.getTime()) / (24 * 3600000),
      );
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevDate = curDate;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    activeDaysCount: activeDays.size,
    isTodayActive,
  };
}
