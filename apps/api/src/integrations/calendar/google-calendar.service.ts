import { Injectable, Logger } from "@nestjs/common";

export interface ExternalCalendarItem {
  id: string;
  name: string;
  isPrimary: boolean;
  canEdit: boolean;
}

export interface ExternalEventPayload {
  id?: string;
  title: string;
  description?: string;
  startAt: string; // ISO 8601
  endAt: string;   // ISO 8601
  isAllDay?: boolean;
  timeZone?: string;
  location?: string;
}

export interface ExternalEventResult {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  status: string;
  timeZone?: string;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly baseApiUrl = "https://www.googleapis.com/calendar/v3";

  /**
   * Scopes strictly necessary for calendar management (excludes Gmail, Drive, etc.)
   */
  readonly scopes = ["https://www.googleapis.com/auth/calendar.events"];

  async listCalendars(accessToken: string): Promise<ExternalCalendarItem[]> {
    try {
      const res = await fetch(`${this.baseApiUrl}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`Google Calendar list failed with status ${res.status}`);
      }
      const data = (await res.json()) as { items?: Array<{ id: string; summary: string; primary?: boolean; accessRole?: string }> };
      return (data.items ?? []).map((cal) => ({
        id: cal.id,
        name: cal.summary,
        isPrimary: Boolean(cal.primary),
        canEdit: cal.accessRole === "owner" || cal.accessRole === "writer",
      }));
    } catch (err) {
      this.logger.error("Failed to list Google calendars", err);
      throw err;
    }
  }

  async listEvents(
    accessToken: string,
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<ExternalEventResult[]> {
    const url = new URL(`${this.baseApiUrl}/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("singleEvents", "true"); // Expands recurrent series within window
    url.searchParams.set("maxResults", "250");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Google Calendar listEvents failed with status ${res.status}`);
    }

    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        summary?: string;
        description?: string;
        status?: string;
        start?: { dateTime?: string; date?: string; timeZone?: string };
        end?: { dateTime?: string; date?: string; timeZone?: string };
      }>;
    };

    return (data.items ?? [])
      .filter((ev) => ev.status !== "cancelled")
      .map((ev) => {
        const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
        const startAt = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00.000Z` : new Date().toISOString());
        const endAt = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T23:59:59.999Z` : startAt);
        return {
          id: ev.id,
          title: ev.summary || "Événement sans titre",
          description: ev.description,
          startAt,
          endAt,
          isAllDay,
          status: ev.status || "confirmed",
          timeZone: ev.start?.timeZone,
        };
      });
  }

  async createEvent(
    accessToken: string,
    calendarId: string,
    payload: ExternalEventPayload,
  ): Promise<{ id: string; htmlLink?: string }> {
    const body: Record<string, unknown> = {
      summary: payload.title,
      description: payload.description,
      location: payload.location,
    };

    if (payload.isAllDay) {
      const startDate = payload.startAt.split("T")[0];
      const endDate = payload.endAt.split("T")[0];
      body.start = { date: startDate };
      body.end = { date: endDate };
    } else {
      body.start = { dateTime: payload.startAt, timeZone: payload.timeZone ?? "UTC" };
      body.end = { dateTime: payload.endAt, timeZone: payload.timeZone ?? "UTC" };
    }

    const res = await fetch(`${this.baseApiUrl}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar createEvent error ${res.status}: ${errText}`);
    }

    const created = (await res.json()) as { id: string; htmlLink?: string };
    return { id: created.id, htmlLink: created.htmlLink };
  }

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    payload: Partial<ExternalEventPayload>,
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (payload.title) body.summary = payload.title;
    if (payload.description !== undefined) body.description = payload.description;

    if (payload.startAt) {
      body.start = { dateTime: payload.startAt, timeZone: payload.timeZone ?? "UTC" };
    }
    if (payload.endAt) {
      body.end = { dateTime: payload.endAt, timeZone: payload.timeZone ?? "UTC" };
    }

    const res = await fetch(
      `${this.baseApiUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
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
      throw new Error(`Google Calendar updateEvent error ${res.status}: ${errText}`);
    }
  }

  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const res = await fetch(
      `${this.baseApiUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`Google Calendar deleteEvent failed with status ${res.status}`);
    }
  }

  async disconnect(token: string): Promise<void> {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch (err) {
      this.logger.warn("Google token revocation returned warning", err);
    }
  }
}
