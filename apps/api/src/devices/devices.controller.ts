import { Controller, Get, Delete, Param, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../database/prisma.service";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/access-token.guard";
@Controller("devices")
@UseGuards(AccessTokenGuard)
export class DevicesController {
  constructor(private readonly db: PrismaService) {}
  @Get() async list(@Req() r: AuthenticatedRequest) {
    const devices = await this.db.device.findMany({
      where: { userId: r.auth.userId, revokedAt: null },
      select: { id: true, deviceName: true, platform: true, lastSeenAt: true },
    });
    return devices.map((d) => ({ ...d, current: d.id === r.auth.deviceId }));
  }
  @Delete(":id") async revoke(
    @Req() r: AuthenticatedRequest,
    @Param("id") value: string,
  ) {
    const id = z.string().uuid().parse(value);
    await this.db.$transaction([
      this.db.device.updateMany({
        where: { id, userId: r.auth.userId },
        data: { revokedAt: new Date() },
      }),
      this.db.session.updateMany({
        where: { deviceId: id, userId: r.auth.userId },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }
}
