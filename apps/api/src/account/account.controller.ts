import { Body, Controller, Delete, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AccountService } from "./account.service";
import { PrismaService } from "../database/prisma.service";
import { GoogleAuthService } from "../auth/google/google-auth.service";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/access-token.guard";
@Controller("account")
export class AccountController {
  constructor(
    private readonly service: AccountService,
    private readonly db: PrismaService,
    private readonly google: GoogleAuthService,
  ) {}
  @Delete() @UseGuards(AccessTokenGuard) delete(
    @Req() r: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    z.object({ confirmation: z.literal("SUPPRIMER") })
      .strict()
      .parse(body);
    return this.service.deleteAccount(r.auth.userId);
  }
  @Post("delete-with-google")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async deleteWithGoogle(@Body() body: unknown) {
    const input = z
      .object({
        idToken: z.string().min(1).max(12000),
        confirmation: z.literal("SUPPRIMER"),
      })
      .strict()
      .parse(body);
    const identity = await this.google.verifyGoogleIdToken(input.idToken);
    const existing = await this.db.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider: "google",
          providerSubject: identity.providerSubject,
        },
      },
    });
    if (existing) await this.service.deleteAccount(existing.userId);
    return { deleted: true };
  }
}
