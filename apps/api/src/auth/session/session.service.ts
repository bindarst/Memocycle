import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
@Injectable()
export class SessionService {
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
  ) {}
  private async tokens(
    userId: string,
    sessionId: string,
    refreshToken: string,
  ) {
    const accessTokenExpiresAt = new Date(
      Date.now() + 15 * 60_000,
    ).toISOString();
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sessionId, type: "access" },
      { expiresIn: "15m", issuer: "memocycle", audience: "memocycle-mobile" },
    );
    return { accessToken, refreshToken, accessTokenExpiresAt };
  }
  async createSession(
    userId: string,
    deviceId: string,
    tx: Prisma.TransactionClient = this.db,
  ) {
    const refreshToken = randomBytes(32).toString("base64url");
    const session = await tx.session.create({
      data: {
        userId,
        deviceId,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 86400_000),
      },
    });
    return this.tokens(userId, session.id, refreshToken);
  }
  async refresh(refreshToken: string) {
    const hash = hashToken(refreshToken);
    const result = await this.db.$transaction(async (tx) => {
      // Lock the session before checking the current hash. Concurrent refreshes cannot both succeed.
      const found = await tx.session.findUnique({
        where: { refreshTokenHash: hash },
      });
      if (!found) {
        const used = await tx.usedRefreshToken.findUnique({ where: { hash } });
        if (used)
          await tx.session.updateMany({
            where: { id: used.sessionId },
            data: { revokedAt: new Date() },
          });
        return null;
      }
      await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${found.id}::uuid FOR UPDATE`;
      const s = await tx.session.findUnique({
        where: { id: found.id },
        include: { user: true, device: true },
      });
      if (!s || s.refreshTokenHash !== hash) {
        await tx.session.updateMany({
          where: { id: found.id },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      if (
        s.revokedAt ||
        s.expiresAt.getTime() <= Date.now() ||
        s.user.status !== "active" ||
        s.device.revokedAt
      )
        return null;
      const next = randomBytes(32).toString("base64url");
      await tx.usedRefreshToken.create({ data: { hash, sessionId: s.id } });
      await tx.session.update({
        where: { id: s.id },
        data: {
          refreshTokenHash: hashToken(next),
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
      });
      return { ...(await this.tokens(s.userId, s.id, next)), user: s.user };
    });
    // Throw outside transaction so replay revocation commits.
    if (!result) throw new UnauthorizedException("Session expirée ou révoquée");
    return result;
  }
  async revoke(userId: string, sessionId?: string) {
    await this.db.session.updateMany({
      where: { userId, ...(sessionId ? { id: sessionId } : {}) },
      data: { revokedAt: new Date() },
    });
  }
}
