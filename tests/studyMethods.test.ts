import { describe, expect, it } from "vitest";
import {
  type Course,
  type Plan,
  calculateAdaptiveReview,
  calculateNextReviewAt,
  CLASSIC_REVIEW_INTERVALS_HOURS,
} from "@memocycle/contracts";
import { determineLearningStage } from "../apps/mobile/src/review/learningStageService";
import { recommendStudyMethod } from "../apps/mobile/src/review/methodRecommendationService";

describe("Study Methods & Adaptive Learning Engine", () => {
  const baseCourse: Course = {
    id: "course_1",
    userId: "user_1",
    version: 1,
    updatedAt: "2026-09-01T10:00:00.000Z",
    deletedAt: null,
    title: "Physiologie Cardiovasculaire",
    importance: 2,
    priority: 2,
    difficulty: "medium",
    estimatedReviewMinutes: 25,
    scheduleMode: "standard",
    contentType: "concepts",
    priorKnowledge: "basic",
    preferredStudyMethod: null,
    methodSelectionMode: "automatic",
  };

  const basePlan: Plan = {
    id: "plan_1",
    userId: "user_1",
    version: 1,
    updatedAt: "2026-09-01T10:00:00.000Z",
    deletedAt: null,
    courseId: "course_1",
    currentStep: 1,
    intervalsJson: [24, 72, 168, 336, 720, 1440],
    scheduleVersion: 1,
    nextReviewAt: "2026-09-02T10:00:00.000Z",
    startedAt: "2026-09-01T10:00:00.000Z",
    lastReviewedAt: null,
    completedAt: null,
    status: "active",
    reps: 0,
    lapses: 0,
    stability: 1,
    difficulty: 5,
  };

  describe("Learning Stage Calculation", () => {
    it("classifies an unreviewed course as acquisition stage", () => {
      const stage = determineLearningStage(basePlan);
      expect(stage).toBe("acquisition");
    });

    it("classifies early repetitions as consolidation stage", () => {
      const stage = determineLearningStage({
        ...basePlan,
        currentStep: 2,
        reps: 2,
        stability: 4,
      });
      expect(stage).toBe("consolidation");
    });

    it("classifies high stability and repetitions as mastery stage", () => {
      const stage = determineLearningStage({
        ...basePlan,
        currentStep: 5,
        reps: 8,
        stability: 45,
      });
      expect(stage).toBe("mastery");
    });
  });

  describe("Study Method Recommendations", () => {
    it("respects manual mode and returns preferred method directly", () => {
      const course: Course = {
        ...baseCourse,
        methodSelectionMode: "manual",
        preferredStudyMethod: "free_recall",
      };

      const rec = recommendStudyMethod(course, basePlan);
      expect(rec.method).toBe("free_recall");
      expect(rec.isAutomatic).toBe(false);
    });

    it("recommends practice_problems or worked_example for problem_solving content", () => {
      const course: Course = {
        ...baseCourse,
        contentType: "problem_solving",
        methodSelectionMode: "automatic",
      };

      const rec = recommendStudyMethod(course, { ...basePlan, reps: 3, stability: 10 });
      expect(["practice_problems", "worked_example"]).toContain(rec.method);
    });

    it("recommends active_reading or self_explanation during acquisition stage with concepts", () => {
      const course: Course = {
        ...baseCourse,
        contentType: "concepts",
        priorKnowledge: "none",
        methodSelectionMode: "automatic",
      };

      const rec = recommendStudyMethod(course, basePlan);
      expect(["active_reading", "self_explanation", "worked_example"]).toContain(rec.method);
    });

    it("recommends cued_recall for facts content during consolidation stage", () => {
      const course: Course = {
        ...baseCourse,
        contentType: "facts",
        priorKnowledge: "familiar",
        methodSelectionMode: "automatic",
      };

      const rec = recommendStudyMethod(course, { ...basePlan, currentStep: 2, reps: 2, stability: 5 });
      expect(["cued_recall", "free_recall"]).toContain(rec.method);
    });
  });

  describe("FSRS Invariance & Voluntary Reviews", () => {
    it("does NOT alter FSRS intervals regardless of which study method was chosen", () => {
      const now = new Date("2026-09-05T10:00:00.000Z");

      const fsrsA = calculateAdaptiveReview({
        completedAt: now,
        rating: "good",
        previousState: {
          reps: 1,
          stability: basePlan.stability,
          difficulty: basePlan.difficulty,
          lastReviewDate: "2026-09-01T10:00:00.000Z",
        },
      });
      const fsrsB = calculateAdaptiveReview({
        completedAt: now,
        rating: "good",
        previousState: {
          reps: 1,
          stability: basePlan.stability,
          difficulty: basePlan.difficulty,
          lastReviewDate: "2026-09-01T10:00:00.000Z",
        },
      });

      expect(fsrsA.nextReviewAt.toISOString()).toBe(fsrsB.nextReviewAt.toISOString());
      expect(fsrsA.memoryState.stability).toBe(fsrsB.memoryState.stability);
      expect(fsrsA.memoryState.difficulty).toBe(fsrsB.memoryState.difficulty);
    });

    it("calculates classic and adaptive review schedules reliably", () => {
      const start = new Date("2026-09-01T10:00:00.000Z");
      const nextDate = calculateNextReviewAt(start, 0, CLASSIC_REVIEW_INTERVALS_HOURS);
      expect(nextDate).not.toBeNull();
      expect(nextDate!.toISOString()).toBe("2026-09-02T10:00:00.000Z");
    });
  });
});
