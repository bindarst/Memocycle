import {
  STUDY_METHOD_LABELS,
  type StudyMethod,
} from "@memocycle/contracts";
import type { Course, Plan } from "../database/entities";
import { determineLearningStage } from "./learningStageService";

export interface MethodRecommendation {
  method: StudyMethod;
  label: string;
  isAutomatic: boolean;
  reason: string;
}

/**
 * Recommends an optimal study method adapted to the course profile, student prior knowledge,
 * content type, and current learning stage.
 */
export function recommendStudyMethod(
  course: Course,
  plan?: Plan | null,
): MethodRecommendation {
  // If user explicitly chose manual mode and set a favorite method, honor it
  if (course.methodSelectionMode === "manual" && course.preferredStudyMethod) {
    const prefMethod = course.preferredStudyMethod as StudyMethod;
    return {
      method: prefMethod,
      label: STUDY_METHOD_LABELS[prefMethod] || prefMethod,
      isAutomatic: false,
      reason: "Méthode favorite définie pour ce cours",
    };
  }

  const stage = determineLearningStage(plan);
  const contentType = course.contentType ?? "mixed";
  const priorKnowledge = course.priorKnowledge ?? "none";

  // 1. Problem Solving / Procedures
  if (contentType === "problem_solving" || contentType === "procedures") {
    if (stage === "acquisition" || priorKnowledge === "none") {
      return {
        method: "worked_example",
        label: STUDY_METHOD_LABELS.worked_example,
        isAutomatic: true,
        reason: "Exemples guidés recommandés pour aborder les procédures",
      };
    }
    return {
      method: "practice_problems",
      label: STUDY_METHOD_LABELS.practice_problems,
      isAutomatic: true,
      reason: "Exercices pratiques recommandés pour consolider la méthode",
    };
  }

  // 2. Concepts
  if (contentType === "concepts") {
    if (stage === "acquisition") {
      return {
        method: "active_reading",
        label: STUDY_METHOD_LABELS.active_reading,
        isAutomatic: true,
        reason: "Lecture active recommandée pour appréhender les concepts",
      };
    }
    if (stage === "consolidation") {
      return {
        method: "self_explanation",
        label: STUDY_METHOD_LABELS.self_explanation,
        isAutomatic: true,
        reason: "Auto-explication recommandée pour ancrer les mécanismes",
      };
    }
    return {
      method: "free_recall",
      label: STUDY_METHOD_LABELS.free_recall,
      isAutomatic: true,
      reason: "Rappel libre recommandé pour évaluer la maîtrise conceptuelle",
    };
  }

  // 3. Facts / Flashcards
  if (contentType === "facts") {
    if (stage === "acquisition") {
      return {
        method: "active_reading",
        label: STUDY_METHOD_LABELS.active_reading,
        isAutomatic: true,
        reason: "Première découverte des faits clés",
      };
    }
    return {
      method: "cued_recall",
      label: STUDY_METHOD_LABELS.cued_recall,
      isAutomatic: true,
      reason: "Questions et fiches recommandées pour la mémorisation factuelle",
    };
  }

  // 4. Mixed / Default
  if (stage === "acquisition") {
    return {
      method: "active_reading",
      label: STUDY_METHOD_LABELS.active_reading,
      isAutomatic: true,
      reason: "Lecture active recommandée pour démarrer l'apprentissage",
    };
  }
  if (stage === "consolidation") {
    return {
      method: "cued_recall",
      label: STUDY_METHOD_LABELS.cued_recall,
      isAutomatic: true,
      reason: "Questions ciblées recommandées pour stabiliser la rétention",
    };
  }

  // Mastery / Retrieval
  return {
    method: "free_recall",
    label: STUDY_METHOD_LABELS.free_recall,
    isAutomatic: true,
    reason: "Rappel libre recommandé pour tester l'ancrage profond",
  };
}
