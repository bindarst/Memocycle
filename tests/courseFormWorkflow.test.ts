import { describe, it, expect } from "vitest";
import {
  courseInput,
  moduleInput,
  examInput,
  subjectInput,
  reviewCommandSchema,
} from "@memocycle/contracts";
import { isZodLikeError, sanitizeErrorMessage } from "../apps/mobile/src/utils/errors";
import { eventSchema } from "../apps/mobile/src/database/entities";
import { randomUUID } from "crypto";

describe("Course & Entity Form Validation and Workflow", () => {
  const validSubjectId = randomUUID();
  const validCourseId = randomUUID();
  const validUserId = randomUUID();
  const validPlanId = randomUUID();
  const validEventId = randomUUID();

  it("1. prevents course creation when subjectId is empty and throws UUID validation error", () => {
    const invalidData = {
      title: "Biologie cellulaire",
      description: null,
      subjectId: "",
      moduleId: null,
    };

    expect(() => courseInput.parse(invalidData)).toThrow();
    try {
      courseInput.parse(invalidData);
    } catch (err) {
      expect(isZodLikeError(err)).toBe(true);
      expect(sanitizeErrorMessage((err as Error).message)).toBe("Vérifie les informations saisies.");
    }
  });

  it("2. allows course creation when a valid subject UUID is provided", () => {
    const validData = {
      title: "Biologie cellulaire",
      description: "Introduction à la cellule",
      subjectId: validSubjectId,
      moduleId: null,
    };

    const parsed = courseInput.parse(validData);
    expect(parsed.title).toBe("Biologie cellulaire");
    expect(parsed.subjectId).toBe(validSubjectId);
    expect(parsed.moduleId).toBeNull();
  });

  it("3. validates subject creation schema and allows chaining to course", () => {
    const subjectData = {
      title: "Sciences",
      description: "Matière scientifique",
      iconKey: "science" as const,
      colorKey: "green" as const,
      position: 0,
      archivedAt: null,
    };

    const parsedSubject = subjectInput.parse(subjectData);
    expect(parsedSubject.title).toBe("Sciences");

    // Once created with a generated UUID, it can be passed to courseInput
    const newSubjectId = randomUUID();
    const courseData = {
      title: "Physique quantique",
      subjectId: newSubjectId,
    };
    const parsedCourse = courseInput.parse(courseData);
    expect(parsedCourse.subjectId).toBe(newSubjectId);
  });

  it("4. rejects module creation when subjectId is empty", () => {
    const invalidModule = {
      title: "Génétique",
      description: null,
      subjectId: "",
    };

    expect(() => moduleInput.parse(invalidModule)).toThrow();
    try {
      moduleInput.parse(invalidModule);
    } catch (err) {
      expect(isZodLikeError(err)).toBe(true);
      expect(sanitizeErrorMessage((err as Error).message)).toBe("Vérifie les informations saisies.");
    }
  });

  it("5. rejects exam creation when subjectId is empty", () => {
    const invalidExam = {
      title: "Examen final",
      subjectId: "",
      moduleId: null,
      examAt: new Date().toISOString(),
      notes: null,
    };

    expect(() => examInput.parse(invalidExam)).toThrow();
    try {
      examInput.parse(invalidExam);
    } catch (err) {
      expect(isZodLikeError(err)).toBe(true);
      expect(sanitizeErrorMessage((err as Error).message)).toBe("Vérifie les informations saisies.");
    }
  });

  it("6. isZodLikeError recognizes Zod errors and transforms them into clean human feedback", () => {
    let capturedError: unknown;
    try {
      courseInput.parse({ title: "", subjectId: "not-a-uuid" });
    } catch (e) {
      capturedError = e;
    }

    expect(isZodLikeError(capturedError)).toBe(true);
    expect(sanitizeErrorMessage((capturedError as Error).message)).toBe("Vérifie les informations saisies.");
  });

  it("7. reviewCommandSchema and eventSchema handle initial study (J'ai étudié ce cours) with null optional fields", () => {
    const commandPayload = {
      command: "start" as const,
      courseId: validCourseId,
      reviewPlanId: validPlanId,
      eventId: validEventId,
      completedAt: new Date().toISOString(),
      stepIndex: 0,
      cycle: 1,
      rating: "good" as const,
      desiredRetention: 0.9,
      durationSeconds: null,
      sessionType: "scheduled_review" as const,
      studyMethod: null,
    };

    const parsedCommand = reviewCommandSchema.parse(commandPayload);
    expect(parsedCommand.command).toBe("start");
    expect(parsedCommand.durationSeconds).toBeNull();
    expect(parsedCommand.studyMethod).toBeNull();

    const eventEntityData = {
      id: validEventId,
      userId: validUserId,
      version: 1,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      courseId: validCourseId,
      reviewPlanId: validPlanId,
      cycle: 1,
      kind: "initial_study",
      stepIndex: null,
      scheduledAt: null,
      completedAt: new Date().toISOString(),
      delayMinutes: 0,
      confidence: "good",
      durationSeconds: null,
      sessionType: "scheduled_review" as const,
      studyMethod: null,
    };

    const parsedEvent = eventSchema.parse(eventEntityData);
    expect(parsedEvent.kind).toBe("initial_study");
    expect(parsedEvent.durationSeconds).toBeNull();
    expect(parsedEvent.studyMethod).toBeNull();
  });
});
