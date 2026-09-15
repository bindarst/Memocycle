import { Injectable, UnauthorizedException } from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
export interface VerifiedGoogleIdentity {
  providerSubject: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}
export class InvalidGoogleTokenError extends UnauthorizedException {
  constructor() {
    super("Identité Google non valide");
  }
}
@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();
  async verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    const audience = [
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_WEB_CLIENT_ID,
    ].filter((s): s is string => Boolean(s));
    if (!audience.length) throw new InvalidGoogleTokenError();
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      const p = ticket.getPayload();
      if (
        !p ||
        !p.sub ||
        !audience.includes(p.aud) ||
        !["accounts.google.com", "https://accounts.google.com"].includes(
          p.iss,
        ) ||
        p.exp <= Date.now() / 1000 ||
        !p.email ||
        !p.email_verified
      )
        throw new InvalidGoogleTokenError();
      return {
        providerSubject: p.sub,
        email: p.email,
        displayName: p.name ?? null,
        avatarUrl: p.picture ?? null,
      };
    } catch {
      throw new InvalidGoogleTokenError();
    }
  }
}
