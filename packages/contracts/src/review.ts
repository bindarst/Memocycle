import { z } from "zod";
export const reviewCommandSchema = z
  .object({
    command: z.enum(["start", "complete", "restart"]),
    courseId: z.string().uuid(),
    reviewPlanId: z.string().uuid(),
    eventId: z.string().uuid(),
    completedAt: z.string().datetime(),
    stepIndex: z.number().int().min(0).max(6),
    cycle: z.number().int().min(1),
  })
  .strict();
export type ReviewCommand = z.infer<typeof reviewCommandSchema>;
