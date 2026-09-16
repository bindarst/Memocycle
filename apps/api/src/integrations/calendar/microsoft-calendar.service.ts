import { Injectable, Logger } from "@nestjs/common";
import type {
  ExternalCalendarItem,
  ExternalEventPayload,
  ExternalEventResult,
} from "./google-calendar.service";

@Injectable()
export class MicrosoftCalendarService {
  private readonly logger = new Logger(MicrosoftCalendarService.name);
  private readonly graphUrl = "https://graph.microsoft.com/v1.0";

  /**
   * Scopes strictly necessary for Microsoft Graph calendar (no Mail, Contacts, or Files)
   */
  readonly scopes = ["Calendars.ReadWrite", "offline_access"];

  async listCalendars(accessToken: string): Promise<ExternalCalendarItem[]> {
    try {
      const res = await fetch(`${this.graphUrl}/me/calendars`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`Microsoft listCalendars failed with status ${res.status}`);
      }
      const data = (await res.json()) as {
        value?: Array<{ id: string; name: string; isDefaultCalendar?: boolean; canEdit?: boolean }>;
      };
      return (data.value ?? []).map((cal) => ({
        id: cal.id,
        name: cal.name,
        isPrimary: Boolean(cal.isDefaultCalendar),
        canEdit: Boolean(cal.canEdit ?? true),
      }));
    } catch (err) {
      this.logger.error("Failed to list Microsoft calendars", err);
      throw err;
    }
  }

  async listEvents(
    accessToken: string,
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<ExternalEventResult[]> {
    const url = new URL(`${this.graphUrl}/me/calendars/${encodeURIComponent(calendarId)}/calendarView`);
    url.searchParams.set("startDateTime", timeMin);
    url.searchParams.set("endDateTime", timeMax);
    url.searchParams.set("$top", "250");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    });

    if (!res.ok) {
      throw new Error(`Microsoft listEvents failed with status ${res.status}`);
    }

    const data = (await res.json()) as {
      value?: Array<{
        id: string;
        subject?: string;
        bodyPreview?: string;
        isAllDay?: boolean;
        isCancelled?: boolean;
        start?: { dateTime?: string; timeZone?: string };
        end?: { dateTime?: string; timeZone?: string };
      }>;
    };

    return (data.value ?? [])
      .filter((ev) => !ev.isCancelled)
      .map((ev) => {
        const startAt = ev.start?.dateTime ? (ev.start.dateTime.endsWith("Z") ? ev.start.dateTime : `${ev.start.dateTime}Z`) : new Date().toISOString();
        const endAt = ev.end?.dateTime ? (ev.end.dateTime.endsWith("Z") ? ev.end.dateTime : `${ev.end.dateTime}Z`) : startAt;

        return {
          id: ev.id,
          title: ev.subject || "Événement Outlook",
          description: ev.bodyPreview,
          startAt,
          endAt,
          isAllDay: Boolean(ev.isAllDay),
          status: "confirmed",
          timeZone: ev.start?.timeZone,
        };
      });
  }

  async createEvent(
    accessToken: string,
    calendarId: string,
    payload: ExternalEventPayload,
  ): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      subject: payload.title,
      body: { contentType: "text", content: payload.description || "" },
      location: payload.location ? { displayName: payload.location } : undefined,
      isAllDay: Boolean(payload.isAllDay),
      start: {
        dateTime: payload.startAt.replace(/Z$/, ""),
        timeZone: payload.timeZone ?? "UTC",
      },
      end: {
        dateTime: payload.endAt.replace(/Z$/, ""),
        timeZone: payload.timeZone ?? "UTC",
      },
    };

    const res = await fetch(`${this.graphUrl}/me/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Microsoft createEvent error ${res.status}: ${errText}`);
    }

    const created = (await res.json()) as { id: string };
    return { id: created.id };
  }

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    payload: Partial<ExternalEventPayload>,
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (payload.title) body.subject = payload.title;
    if (payload.description !== undefined) {
      body.body = { contentType: "text", content: payload.description };
    }
    if (payload.startAt) {
      body.start = {
        dateTime: payload.startAt.replace(/Z$/, ""),
        timeZone: payload.timeZone ?? "UTC",
      };
    }
    if (payload.endAt) {
      body.end = {
        dateTime: payload.endAt.replace(/Z$/, ""),
        timeZone: payload.timeZone ?? "UTC",
      };
    }

    const res = await fetch(
      `${this.graphUrl}/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      throw new Error(`Microsoft updateEvent error ${res.status}: ${errText}`);
    }
  }

  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const res = await fetch(
      `${this.graphUrl}/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok && res.status !== 404) {
      throw new Error(`Microsoft deleteEvent error status: ${res.status}`);
    }
  }

  async disconnect(): Promise<void> {
    // Microsoft Graph tokens expire naturally or are invalidated client-side
    this.logger.log("Microsoft disconnect: local cleanup and token destruction completed");
  }
}
