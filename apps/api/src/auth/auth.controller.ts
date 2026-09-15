import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { authRequestSchema, authResponseSchema } from "@memocycle/contracts";
import { z } from "zod";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { SessionService } from "./session/session.service";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "./guards/access-token.guard";
@Controller("auth")
@Throttle({ default: { limit: 15, ttl: 60_000 } })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}
  @Post("google") google(@Body() body: unknown) {
    return this.auth.signIn("google", authRequestSchema.parse(body));
  }
  @Post("apple") apple(@Body() body: unknown) {
    return this.auth.signIn("apple", authRequestSchema.parse(body));
  }
  @Post("refresh") async refresh(@Body() body: unknown) {
    const p = z
      .object({ refreshToken: z.string().min(40).max(200) })
      .strict()
      .parse(body);
    return authResponseSchema.parse(
      await this.sessions.refresh(p.refreshToken),
    );
  }
  @Post("logout") @UseGuards(AccessTokenGuard) async logout(
    @Req() r: AuthenticatedRequest,
  ) {
    await this.sessions.revoke(r.auth.userId, r.auth.sessionId);
    return { ok: true };
  }
  @Post("logout-all") @UseGuards(AccessTokenGuard) async logoutAll(
    @Req() r: AuthenticatedRequest,
  ) {
    await this.sessions.revoke(r.auth.userId);
    return { ok: true };
  }
}
