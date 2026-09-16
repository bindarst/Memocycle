import { z } from "zod";

export const studyMethodSchema = z.enum([
  "passive_reading",
  "active_reading",
  "self_explanation",
  "free_recall",
  "cued_recall",
  "practice_problems",
  "worked_example",
]);
export type StudyMethod = z.infer<typeof studyMethodSchema>;

export const STUDY_METHOD_LABELS: Record<StudyMethod, string> = {
  passive_reading: "Lecture",
  active_reading: "Lecture active",
  self_explanation: "Auto-explication",
  free_recall: "Rappel libre",
  cued_recall: "Questions",
  practice_problems: "Exercices",
  worked_example: "Exemple guidé",
};

export const methodSelectionModeSchema = z.enum(["automatic", "manual"]);
export type MethodSelectionMode = z.infer<typeof methodSelectionModeSchema>;

export const contentTypeSchema = z.enum([
  "facts",
  "concepts",
  "procedures",
  "problem_solving",
  "mixed",
]);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  facts: "Faits",
  concepts: "Concepts",
  procedures: "Procédures",
  problem_solving: "Problèmes",
  mixed: "Mixte",
};

export const priorKnowledgeSchema = z.enum([
  "none",
  "basic",
  "familiar",
  "strong",
]);
export type PriorKnowledge = z.infer<typeof priorKnowledgeSchema>;

export const PRIOR_KNOWLEDGE_LABELS: Record<PriorKnowledge, string> = {
  none: "Nouveau",
  basic: "Quelques bases",
  familiar: "Familier",
  strong: "Solide",
};

export const learningStageSchema = z.enum([
  "acquisition",
  "consolidation",
  "retrieval",
  "mastery",
]);
export type LearningStage = z.infer<typeof learningStageSchema>;

export const LEARNING_STAGE_LABELS: Record<LearningStage, string> = {
  acquisition: "Acquisition",
  consolidation: "Consolidation",
  retrieval: "Rappel actif",
  mastery: "Maîtrise",
};
