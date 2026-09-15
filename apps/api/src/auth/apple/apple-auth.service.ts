import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { VerifiedGoogleIdentity } from "../google/google-auth.service";
@Injectable()
export class AppleAuthService {
  private keys:
    | ReturnType<
        typeof import("jose", {
          with: { "resolution-mode": "import" },
        }).createRemoteJWKSet
      >
    | undefined;
  async verify(
    idToken: string,
    nonce: string,
  ): Promise<Omit<VerifiedGoogleIdentity, "email"> & { email: string | null }> {
    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    this.keys ??= createRemoteJWKSet(
      new URL("https://appleid.apple.com/auth/keys"),
    );
    try {
      if (!process.env.APPLE_CLIENT_ID) throw new Error("Missing audience");
      const { payload: p } = await jwtVerify(idToken, this.keys, {
        issuer: "https://appleid.apple.com",
        audience: process.env.APPLE_CLIENT_ID,
        algorithms: ["RS256"],
      });
      if (!p.sub || p.nonce !== nonce) throw new Error("Invalid nonce");
      return {
        providerSubject: p.sub,
        email: typeof p.email === "string" ? p.email : null,
        displayName: null,
        avatarUrl: null,
      };
    } catch {
      throw new UnauthorizedException("Identité Apple non valide");
    }
  }
}
