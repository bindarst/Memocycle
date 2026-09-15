import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { z } from "zod";
import { PrismaService } from "../../database/prisma.service";
import type { Request } from "express";
export type AuthenticatedRequest = Request & {
  auth: { userId: string; sessionId: string; deviceId: string };
};
const payload = z.object({
  sub: z.string().uuid(),
  sessionId: z.string().uuid(),
  type: z.literal("access"),
});
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: PrismaService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new UnauthorizedException();
    try {
      const p = payload.parse(
        await this.jwt.verifyAsync(token, {
          algorithms: ["HS256"],
          issuer: "memocycle",
          audience: "memocycle-mobile",
        }),
      );
      const s = await this.db.session.findFirst({
        where: {
          id: p.sessionId,
          userId: p.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { status: "active" },
          device: { revokedAt: null },
        },
      });
      if (!s) throw new Error("Revoked");
      req.auth = { userId: p.sub, sessionId: s.id, deviceId: s.deviceId };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
