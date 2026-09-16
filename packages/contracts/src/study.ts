import { z } from "zod";

export const studyItemTypeSchema = z.enum([
  "flashcard",
  "question",
  "cloze",
  "note",
]);
export type StudyItemType = z.infer<typeof studyItemTypeSchema>;

export const studyItemInput = z
  .object({
    courseId: z.string().uuid(),
    type: studyItemTypeSchema,
    front: z.string().trim().max(5000).nullable().default(null),
    back: z.string().trim().max(5000).nullable().default(null),
    hint: z.string().trim().max(1000).nullable().default(null),
    position: z.number().int().min(0).default(0),
    archivedAt: z.string().datetime().nullable().default(null),
  })
  .strict()
  .refine(
    (data) => {
      if (data.type === "flashcard" || data.type === "question") {
        return (
          typeof data.front === "string" &&
          data.front.length > 0 &&
          typeof data.back === "string" &&
          data.back.length > 0
        );
      }
      if (data.type === "cloze") {
        return typeof data.front === "string" && data.front.length > 0;
      }
      return true;
    },
    {
      message: "Les fiches et questions nécessitent une face et une réponse.",
    },
  );

export type StudyItemInput = z.infer<typeof studyItemInput>;
