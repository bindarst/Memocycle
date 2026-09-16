import { Module } from "@nestjs/common";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { CalendarCryptoService } from "./calendar-crypto.service";
import { GoogleCalendarService } from "./google-calendar.service";
import { MicrosoftCalendarService } from "./microsoft-calendar.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [CalendarController],
  providers: [
    PrismaService,
    CalendarCryptoService,
    GoogleCalendarService,
    MicrosoftCalendarService,
    CalendarService,
  ],
  exports: [CalendarService, CalendarCryptoService],
})
export class CalendarModule {}
