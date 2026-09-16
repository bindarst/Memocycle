import { ZodError } from "zod";

export function isZodLikeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof ZodError) return true;
  const e = error as Record<string, unknown>;
  if (e.name === "ZodError") return true;
  if (Array.isArray(e.issues)) return true;
  if (
    typeof e.message === "string" &&
    (e.message.startsWith("[") ||
      e.message.includes("invalid_string") ||
      e.message.includes("Invalid uuid"))
  ) {
    return true;
  }
  return false;
}

export function sanitizeErrorMessage(message?: string | null): string {
  if (!message) return "";
  const trimmed = message.trim();
  if (
    trimmed.startsWith("[") ||
    trimmed.startsWith("{") ||
    trimmed.includes("Invalid uuid") ||
    trimmed.includes("invalid_string") ||
    trimmed.includes("ZodError") ||
    trimmed.includes("syntax error")
  ) {
    return "Vérifie les informations saisies.";
  }
  return trimmed;
}
