import { z } from "zod";
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  onboardingCompleted: z.boolean(),
  subscriptionTier: z.enum(["free", "pro"]),
});
export type User = z.infer<typeof userSchema>;
