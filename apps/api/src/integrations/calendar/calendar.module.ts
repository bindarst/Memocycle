import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { CalendarCryptoService } from "./calendar-crypto.service";
import { GoogleCalendarService } from "./google-calendar.service";
import { MicrosoftCalendarService } from "./microsoft-calendar.service";
import { PrismaService } from "../../database/prisma.service";
import { AccessTokenGuard } from "../../auth/guards/access-token.guard";

@Module({
  imports: [JwtModule.registerAsync({
    useFactory: () => ({ secret: process.env.JWT_SECRET }),
  })],
  controllers: [CalendarController],
  providers: [
    PrismaService,
    AccessTokenGuard,
    CalendarCryptoService,
    GoogleCalendarService,
    MicrosoftCalendarService,
    CalendarService,
  ],
  exports: [CalendarService, CalendarCryptoService],
})
export class CalendarModule {}
