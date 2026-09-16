import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaService } from "./database/prisma.service";
import { GoogleAuthService } from "./auth/google/google-auth.service";
import { AppleAuthService } from "./auth/apple/apple-auth.service";
import { SessionService } from "./auth/session/session.service";
import { AuthService } from "./auth/auth.service";
import { AccessTokenGuard } from "./auth/guards/access-token.guard";
import { AuthController } from "./auth/auth.controller";
import { SyncService } from "./sync/sync.service";
import { SyncController } from "./sync/sync.controller";
import { AccountService } from "./account/account.service";
import { AccountController } from "./account/account.controller";
import { DevicesController } from "./devices/devices.controller";
import { HealthController } from "./health/health.controller";
import { CalendarModule } from "./integrations/calendar/calendar.module";
@Module({
  imports: [
    CalendarModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32 || secret.startsWith("replace_"))
          throw new Error(
            "JWT_SECRET must contain at least 32 random characters",
          );
        return { secret };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  providers: [
    PrismaService,
    GoogleAuthService,
    AppleAuthService,
    SessionService,
    AuthService,
    AccessTokenGuard,
    SyncService,
    AccountService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  controllers: [
    AuthController,
    SyncController,
    AccountController,
    DevicesController,
    HealthController,
  ],
})
export class AppModule {}
