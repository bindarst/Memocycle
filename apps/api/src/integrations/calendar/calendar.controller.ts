import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AccessTokenGuard } from "../../auth/guards/access-token.guard";
import type { AuthenticatedRequest } from "../../auth/guards/access-token.guard";
import { CalendarService, type RegisterConnectionDto } from "./calendar.service";
import type { CalendarConnection, UnifiedCalendarEvent } from "@memocycle/contracts";

@Controller("integrations/calendar")
@UseGuards(AccessTokenGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get("connections")
  async listConnections(@Req() req: AuthenticatedRequest): Promise<CalendarConnection[]> {
    return this.calendarService.listConnections(req.auth.userId);
  }

  @Post("connections")
  async registerConnection(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterConnectionDto,
  ): Promise<CalendarConnection> {
    return this.calendarService.registerConnection(req.auth.userId, dto);
  }

  @Delete("connections/:id")
  async disconnect(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Query("keepEvents") keepEvents?: string,
  ): Promise<{ success: boolean }> {
    const shouldKeep = keepEvents === undefined ? true : keepEvents === "true";
    await this.calendarService.disconnectConnection(req.auth.userId, id, shouldKeep);
    return { success: true };
  }

  @Get("external-events")
  async getExternalEvents(
    @Req() req: AuthenticatedRequest,
    @Query("timeMin") timeMin: string,
    @Query("timeMax") timeMax: string,
  ): Promise<UnifiedCalendarEvent[]> {
    const min = timeMin || new Date().toISOString();
    const max =
      timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return this.calendarService.fetchExternalEvents(req.auth.userId, min, max);
  }
}
