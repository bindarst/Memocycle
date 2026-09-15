import { z } from "zod";
import { userSchema } from "./user";
export const deviceSchema = z
  .object({
    installationId: z.string().uuid(),
    platform: z.enum(["android", "ios"]),
    appVersion: z.string().min(1).max(50),
    deviceName: z.string().max(100).optional(),
  })
  .strict();
export const authRequestSchema = z
  .object({
    idToken: z.string().min(1).max(12000),
    device: deviceSchema,
    timezone: z
      .string()
      .max(100)
      .refine((s) => {
        try {
          new Intl.DateTimeFormat("fr", { timeZone: s });
          return true;
        } catch {
          return false;
        }
      }),
    nonce: z.string().min(16).max(200).optional(),
    displayName: z.string().max(100).optional(),
  })
  .strict();
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.string().datetime(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type AuthRequest = z.infer<typeof authRequestSchema>;
export type AuthState =
  "booting" | "authenticated" | "offline_authenticated" | "unauthenticated";
export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
  type: "access";
}
