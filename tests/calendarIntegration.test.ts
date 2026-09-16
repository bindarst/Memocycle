import { describe, expect, it } from "vitest";
import {
  generateIcsCalendar,
  type UnifiedCalendarEvent,
} from "@memocycle/contracts";
import {
  detectCalendarConflicts,
  suggestAlternativeStudySlots,
} from "../apps/mobile/src/calendar/calendarService";
import {
  canExternalUpdateSchedule,
  canExternalUpdateFsrsState,
  mapExternalToUnavailableSlot,
} from "../apps/mobile/src/calendar/calendarMapping";
import { CalendarCryptoService } from "../apps/api/src/integrations/calendar/calendar-crypto.service";

describe("Calendar Integration & Security", () => {
  const cryptoService = new CalendarCryptoService();

  describe("Token Encryption & GDPR Protection", () => {
    it("encrypts and decrypts OAuth tokens securely using AES-256-GCM", () => {
      const secretToken = "ya29.a0AfH6SMB_secret_google_refresh_token_12345";
      const encrypted = cryptoService.encrypt(secretToken);

      expect(encrypted).not.toBe(secretToken);
      expect(encrypted.split(":")).toHaveLength(3); // iv:tag:data

      const decrypted = cryptoService.decrypt(encrypted);
      expect(decrypted).toBe(secretToken);
    });

    it("masks sensitive tokens for audit logging without leaking secrets", () => {
      const token = "ya29.a0AfH6SMB_sample_token_9876543210";
      const masked = cryptoService.maskToken(token);

      expect(masked).toBe("ya29...3210");
      expect(masked).not.toContain("sample_token");
    });
  });

  describe("Calendar Source of Truth & FSRS Invariants", () => {
    it("strictly forbids external events from mutating FSRS memory parameters", () => {
      expect(canExternalUpdateFsrsState()).toBe(false);
    });

    it("allows schedule adjustment only if two_way sync mode is active and user permitted it", () => {
      expect(canExternalUpdateSchedule("disabled")).toBe(false);
      expect(canExternalUpdateSchedule("export_only")).toBe(false);
      expect(canExternalUpdateSchedule("two_way")).toBe(true);
    });

    it("maps external calendar events to busy availability without converting to courses", () => {
      const externalEvent: UnifiedCalendarEvent = {
        id: "ext_gcal_101",
        title: "Dentiste",
        startAt: "2026-09-20T14:00:00.000Z",
        endAt: "2026-09-20T15:00:00.000Z",
        isAllDay: false,
        type: "external",
        sourceProvider: "google",
        busy: true,
      };

      const slot = mapExternalToUnavailableSlot(externalEvent);
      expect(slot.busy).toBe(true);
      expect(slot.startAt).toBe("2026-09-20T14:00:00.000Z");
      expect(slot.endAt).toBe("2026-09-20T15:00:00.000Z");
    });
  });

  describe("Conflict Detection & Slot Suggestions", () => {
    const externalBusy: UnifiedCalendarEvent[] = [
      {
        id: "meeting_1",
        title: "Cours magistral Amphi A",
        startAt: "2026-09-20T14:00:00.000Z",
        endAt: "2026-09-20T16:00:00.000Z",
        isAllDay: false,
        type: "external",
        sourceProvider: "google",
        busy: true,
      },
    ];

    it("detects when a MémoCycle review or study session overlaps with an external busy event", () => {
      const localReviews = [
        {
          id: "rev_1",
          title: "Révision Cardiologie",
          type: "review" as const,
          startAt: "2026-09-20T14:30:00.000Z",
          endAt: "2026-09-20T15:00:00.000Z",
        },
        {
          id: "rev_2",
          title: "Révision Neurologie",
          type: "review" as const,
          startAt: "2026-09-20T18:00:00.000Z",
          endAt: "2026-09-20T18:30:00.000Z",
        },
      ];

      const conflicts = detectCalendarConflicts(localReviews, externalBusy);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.eventId).toBe("rev_1");
      expect(conflicts[0]?.conflictingWith.externalTitle).toBe("Cours magistral Amphi A");
    });

    it("proposes conflict-free alternative study slots respecting preferred time", () => {
      const conflict = {
        eventId: "rev_1",
        eventTitle: "Révision Cardiologie",
        eventType: "review" as const,
        startAt: "2026-09-20T14:30:00.000Z",
        endAt: "2026-09-20T15:00:00.000Z",
        conflictingWith: {
          externalId: "meeting_1",
          externalTitle: "Cours magistral Amphi A",
          startAt: "2026-09-20T14:00:00.000Z",
          endAt: "2026-09-20T16:00:00.000Z",
        },
      };

      const proposals = suggestAlternativeStudySlots(
        conflict,
        externalBusy,
        "18:00",
        30,
      );

      expect(proposals.length).toBeGreaterThan(0);
      for (const prop of proposals) {
        const pStart = new Date(prop.startAt).getTime();
        const pEnd = new Date(prop.endAt).getTime();
        const busyStart = new Date("2026-09-20T14:00:00.000Z").getTime();
        const busyEnd = new Date("2026-09-20T16:00:00.000Z").getTime();
        // Proposal must not overlap with busy time
        expect(pStart < busyEnd && pEnd > busyStart).toBe(false);
      }
    });
  });

  describe("RFC 5545 iCalendar (.ics) Export", () => {
    it("generates valid standard .ics format without leaking sensitive personal credentials", () => {
      const ics = generateIcsCalendar([
        {
          id: "export_1",
          title: "Examen Pharmacologie",
          startAt: "2026-09-25T09:00:00.000Z",
          endAt: "2026-09-25T11:00:00.000Z",
          type: "exam",
          description: "Salle B12",
        },
      ]);

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("PRODID:-//MémoCycle//Study Assistant//FR");
      expect(ics).toContain("SUMMARY:Examen Pharmacologie");
      expect(ics).toContain("DESCRIPTION:Salle B12");
      expect(ics).toContain("END:VCALENDAR");
      expect(ics).not.toContain("password");
      expect(ics).not.toContain("token");
    });
  });

  describe("Offline-first Standalone Behavior", () => {
    it("operates normally with zero connected external calendars", () => {
      const localReviews = [
        {
          id: "rev_1",
          title: "Révision Biochimie",
          type: "review" as const,
          startAt: "2026-09-20T10:00:00.000Z",
          endAt: "2026-09-20T10:30:00.000Z",
        },
      ];

      const conflicts = detectCalendarConflicts(localReviews, []);
      expect(conflicts).toHaveLength(0);
    });
  });
});
