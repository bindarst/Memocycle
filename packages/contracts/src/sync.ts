import { z } from "zod";
export const entityTypeSchema = z.enum([
  "subject",
  "module",
  "course",
  "exam",
  "studyItem",
  "reviewPlan",
  "reviewEvent",
  "userSettings",
]);
export type EntityType = z.infer<typeof entityTypeSchema>;
export const entitySchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    version: z.number().int(),
    updatedAt: z.string().datetime(),
    createdAt: z.string().datetime().optional(),
    deletedAt: z.string().datetime().nullable(),
  })
  .passthrough();
export type Entity = z.infer<typeof entitySchema>;
export const mutationSchema = z
  .object({
    clientMutationId: z.string().uuid(),
    entityType: entityTypeSchema,
    entityId: z.string().uuid(),
    operation: z.enum(["create", "update", "delete", "command"]),
    baseVersion: z.number().int().min(1).nullable(),
    payload: z.unknown(),
  })
  .strict();
export type Mutation = z.infer<typeof mutationSchema>;
export const syncRequestSchema = z
  .object({
    cursor: z.string().regex(/^\d+$/).max(20).nullable(),
    mutations: z.array(mutationSchema).max(100),
  })
  .strict();
export const mutationResultSchema = z.object({
  clientMutationId: z.string().uuid(),
  status: z.enum(["accepted", "conflict", "rejected"]),
  entity: entitySchema.optional(),
  reason: z.string().optional(),
});
export const syncResponseSchema = z.object({
  cursor: z.string(),
  hasMore: z.boolean(),
  mutationResults: z.array(mutationResultSchema),
  changes: z.array(
    z.object({ entityType: entityTypeSchema, entity: entitySchema }),
  ),
});
export type MutationResult = z.infer<typeof mutationResultSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;
