import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CalendarCryptoService } from "./calendar-crypto.service";
import { GoogleCalendarService } from "./google-calendar.service";
import { MicrosoftCalendarService } from "./microsoft-calendar.service";
import type {
  CalendarConnection,
  CalendarProvider,
  CalendarSyncMode,
  UnifiedCalendarEvent,
} from "@memocycle/contracts";

export interface RegisterConnectionDto {
  provider: CalendarProvider;
  providerAccountId: string;
  accountLabel: string;
  syncMode: CalendarSyncMode;
  calendarId?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CalendarCryptoService,
    private readonly google: GoogleCalendarService,
    private readonly microsoft: MicrosoftCalendarService,
  ) {}

  /**
   * Returns all active calendar connections for a user without leaking tokens.
   */
  async listConnections(userId: string): Promise<CalendarConnection[]> {
    const records = await this.prisma.calendarConnection.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return records.map((r) => ({
      id: r.id,
      provider: r.provider as CalendarProvider,
      accountLabel: r.accountLabel,
      syncMode: r.syncMode as CalendarSyncMode,
      calendarId: r.calendarId,
      enabled: r.enabled,
      lastSyncAt: r.lastSyncAt ? r.lastSyncAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /**
   * Registers or updates an external calendar connection, securely encrypting OAuth tokens.
   */
  async registerConnection(userId: string, dto: RegisterConnectionDto): Promise<CalendarConnection> {
    const encryptedAccess = this.crypto.encrypt(dto.accessToken);
    const encryptedRefresh = dto.refreshToken ? this.crypto.encrypt(dto.refreshToken) : null;
    const tokenExpiresAt = dto.expiresInSeconds
      ? new Date(Date.now() + dto.expiresInSeconds * 1000)
      : null;

    this.logger.log(
      `Registering calendar connection for user ${userId}, provider ${dto.provider}, maskedToken: ${this.crypto.maskToken(dto.accessToken)}`,
    );

    const record = await this.prisma.calendarConnection.upsert({
      where: {
        userId_provider_providerAccountId: {
          userId,
          provider: dto.provider,
          providerAccountId: dto.providerAccountId,
        },
      },
      create: {
        userId,
        provider: dto.provider,
        providerAccountId: dto.providerAccountId,
        accountLabel: dto.accountLabel,
        syncMode: dto.syncMode,
        calendarId: dto.calendarId ?? null,
        enabled: true,
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        tokenExpiresAt,
      },
      update: {
        accountLabel: dto.accountLabel,
        syncMode: dto.syncMode,
        calendarId: dto.calendarId ?? null,
        enabled: true,
        encryptedAccessToken: encryptedAccess,
        ...(encryptedRefresh ? { encryptedRefreshToken: encryptedRefresh } : {}),
        tokenExpiresAt,
        updatedAt: new Date(),
      },
    });

    return {
      id: record.id,
      provider: record.provider as CalendarProvider,
      accountLabel: record.accountLabel,
      syncMode: record.syncMode as CalendarSyncMode,
      calendarId: record.calendarId,
      enabled: record.enabled,
      lastSyncAt: record.lastSyncAt ? record.lastSyncAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  /**
   * Disconnects an integration with the option to keep or delete events created by MémoCycle.
   */
  async disconnectConnection(
    userId: string,
    connectionId: string,
    keepCreatedEvents = true,
  ): Promise<void> {
    const conn = await this.prisma.calendarConnection.findFirst({
      where: { id: connectionId, userId },
      include: { eventLinks: true },
    });

    if (!conn) {
      throw new NotFoundException("Connexion calendrier introuvable");
    }

    // If user chose to delete exported MémoCycle events from external calendar
    if (!keepCreatedEvents && conn.calendarId && conn.encryptedAccessToken) {
      try {
        const token = this.crypto.decrypt(conn.encryptedAccessToken);
        for (const link of conn.eventLinks) {
          try {
            if (conn.provider === "google") {
              await this.google.deleteEvent(token, link.externalCalendarId, link.externalEventId);
            } else if (conn.provider === "microsoft") {
              await this.microsoft.deleteEvent(token, link.externalCalendarId, link.externalEventId);
            }
          } catch (delErr) {
            this.logger.warn(`Could not delete external event ${link.externalEventId}`, delErr);
          }
        }
      } catch (err) {
        this.logger.error("Failed to cleanup external calendar events", err);
      }
    }

    // Revoke token if supported
    if (conn.provider === "google" && conn.encryptedRefreshToken) {
      try {
        const refresh = this.crypto.decrypt(conn.encryptedRefreshToken);
        await this.google.disconnect(refresh);
      } catch (revokeErr) {
        this.logger.warn("Token revocation note", revokeErr);
      }
    }

    // Delete links and connection
    await this.prisma.$transaction([
      this.prisma.calendarEventLink.deleteMany({ where: { connectionId } }),
      this.prisma.calendarConnection.delete({ where: { id: connectionId } }),
    ]);

    this.logger.log(`Calendar connection ${connectionId} disconnected for user ${userId}`);
  }

  /**
   * Fetches busy external events (if two_way sync is active) across all user connections.
   */
  async fetchExternalEvents(
    userId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<UnifiedCalendarEvent[]> {
    const connections = await this.prisma.calendarConnection.findMany({
      where: { userId, enabled: true, syncMode: "two_way" },
    });

    const allEvents: UnifiedCalendarEvent[] = [];

    for (const conn of connections) {
      if (!conn.calendarId || !conn.encryptedAccessToken) continue;

      try {
        const token = this.crypto.decrypt(conn.encryptedAccessToken);
        let items: Array<{
          id: string;
          title: string;
          description?: string;
          startAt: string;
          endAt: string;
          isAllDay: boolean;
        }> = [];

        if (conn.provider === "google") {
          items = await this.google.listEvents(token, conn.calendarId, timeMin, timeMax);
        } else if (conn.provider === "microsoft") {
          items = await this.microsoft.listEvents(token, conn.calendarId, timeMin, timeMax);
        }

        for (const it of items) {
          allEvents.push({
            id: it.id,
            title: it.title,
            startAt: it.startAt,
            endAt: it.endAt,
            type: "external",
            isAllDay: it.isAllDay,
            sourceProvider: conn.provider as CalendarProvider,
            notes: it.description,
            busy: true,
          });
        }
      } catch (err) {
        this.logger.error(`Error reading events from ${conn.provider} for user ${userId}`, err);
      }
    }

    return allEvents;
  }
}
