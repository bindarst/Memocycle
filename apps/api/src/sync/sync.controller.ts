import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { syncRequestSchema } from "@memocycle/contracts";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../auth/guards/access-token.guard";
import { SyncService } from "./sync.service";
@Controller("sync")
@UseGuards(AccessTokenGuard)
export class SyncController {
  constructor(private readonly service: SyncService) {}
  @Post() sync(@Req() r: AuthenticatedRequest, @Body() body: unknown) {
    return this.service.sync(
      r.auth.userId,
      r.auth.deviceId,
      syncRequestSchema.parse(body),
    );
  }
}
