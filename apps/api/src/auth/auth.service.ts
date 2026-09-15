import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { authResponseSchema, type AuthRequest } from "@memocycle/contracts";
import { PrismaService } from "../database/prisma.service";
import { GoogleAuthService } from "./google/google-auth.service";
import { AppleAuthService } from "./apple/apple-auth.service";
import { SessionService } from "./session/session.service";
@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly google: GoogleAuthService,
    private readonly apple: AppleAuthService,
    private readonly sessions: SessionService,
  ) {}
  async signIn(provider: "google" | "apple", input: AuthRequest) {
    const identity =
      provider === "google"
        ? await this.google.verifyGoogleIdToken(input.idToken)
        : await this.apple.verify(input.idToken, input.nonce ?? "");
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.db.$transaction(async (tx) => {
          const existing = await tx.authIdentity.findUnique({
            where: {
              provider_providerSubject: {
                provider,
                providerSubject: identity.providerSubject,
              },
            },
            include: { user: true },
          });
          if (existing && existing.user.status !== "active")
            throw new UnauthorizedException("Compte indisponible");
          if (!existing && !identity.email)
            throw new UnauthorizedException(
              "Une adresse e-mail vérifiée est nécessaire",
            );
          const user =
            existing?.user ??
            (await tx.user.create({
              data: {
                email: identity.email!,
                displayName: identity.displayName ?? input.displayName,
                avatarUrl: identity.avatarUrl,
                timezone: input.timezone,
                identities: {
                  create: {
                    provider,
                    providerSubject: identity.providerSubject,
                    emailAtAuth: identity.email,
                  },
                },
                settings: { create: {} },
              },
            }));
          // Never link identities by email. Google and Apple linking requires separate explicit proof.
          const device = await tx.device.upsert({
            where: {
              userId_installationId: {
                userId: user.id,
                installationId: input.device.installationId,
              },
            },
            create: { userId: user.id, ...input.device },
            update: {
              ...input.device,
              revokedAt: null,
              lastSeenAt: new Date(),
            },
          });
          const tokens = await this.sessions.createSession(
            user.id,
            device.id,
            tx,
          );
          return authResponseSchema.parse({ ...tokens, user });
        });
      } catch (e) {
        if (
          !(
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) ||
          attempt === 2
        )
          throw e;
      }
    }
    throw new UnauthorizedException();
  }
}
