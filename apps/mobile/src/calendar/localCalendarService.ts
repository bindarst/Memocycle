import type {
  UnifiedCalendarEvent,
} from "@memocycle/contracts";

export interface DeviceCalendarInfo {
  id: string;
  title: string;
  source: string;
  isPrimary: boolean;
  allowsModifications: boolean;
}

// In-memory or persisted mock state when native module is mocked/unavailable in development
let selectedCalendarId: string | null = null;
let isConnected = false;
let localEventsStore: UnifiedCalendarEvent[] = [];

// Helper to safely load expo-calendar module when available
async function getCalendarModule() {
  try {
    // @ts-expect-error Optional native module in web/test environments
    return await import("expo-calendar");
  } catch {
    return null;
  }
}

/**
 * Connects the phone's native calendar following explicit user consent.
 */
export async function requestDeviceCalendarPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  try {
    const Calendar = await getCalendarModule();
    if (Calendar && typeof Calendar.requestCalendarPermissionsAsync === "function") {
      const res = await Calendar.requestCalendarPermissionsAsync();
      const granted = res.status === "granted";
      if (granted) isConnected = true;
      return { granted, canAskAgain: res.canAskAgain ?? true };
    }
  } catch {
    // Graceful fallback for non-native test environments
  }

  // Fallback simulator / permission granted flag
  isConnected = true;
  return { granted: true, canAskAgain: true };
}

/**
 * Lists calendars available on the local device.
 */
export async function listDeviceCalendars(): Promise<DeviceCalendarInfo[]> {
  try {
    const Calendar = await getCalendarModule();
    if (Calendar && typeof Calendar.getCalendarsAsync === "function") {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      return (calendars ?? []).map((c: { id: string; title: string; source?: { name?: string }; isPrimary?: boolean; allowsModifications?: boolean }) => ({
        id: c.id,
        title: c.title,
        source: c.source?.name ?? "Téléphone",
        isPrimary: Boolean(c.isPrimary),
        allowsModifications: Boolean(c.allowsModifications ?? true),
      }));
    }
  } catch {
    // Fallback for mock environments
  }

  return [
    {
      id: "device-default-cal",
      title: "Calendrier personnel",
      source: "Appareil",
      isPrimary: true,
      allowsModifications: true,
    },
  ];
}

export function setSelectedDeviceCalendar(calendarId: string | null) {
  selectedCalendarId = calendarId;
}

export function getSelectedDeviceCalendar(): string | null {
  return selectedCalendarId ?? (isConnected ? "device-default-cal" : null);
}

export function isDeviceCalendarConnected(): boolean {
  return isConnected;
}

export function disconnectDeviceCalendar() {
  isConnected = false;
  selectedCalendarId = null;
  localEventsStore = [];
}

/**
 * Fetches events from the device calendar within a given window.
 */
export async function fetchDeviceEvents(
  startAt: string,
  endAt: string,
): Promise<UnifiedCalendarEvent[]> {
  if (!isConnected) return [];

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  try {
    const Calendar = await getCalendarModule();
    const calId = getSelectedDeviceCalendar();
    if (Calendar && typeof Calendar.getEventsAsync === "function" && calId) {
      const rawEvents = await Calendar.getEventsAsync([calId], startDate, endDate);
      return (rawEvents ?? []).map((ev: { id: string; title: string; startDate: string; endDate: string; allDay?: boolean; notes?: string; location?: string }) => ({
        id: `device-${ev.id}`,
        title: ev.title || "Événement calendrier",
        startAt: new Date(ev.startDate).toISOString(),
        endAt: new Date(ev.endDate).toISOString(),
        type: "external" as const,
        isAllDay: Boolean(ev.allDay),
        sourceProvider: "device" as const,
        notes: ev.notes,
        location: ev.location,
        busy: true,
      }));
    }
  } catch {
    // Fallback on in-memory store
  }

  return localEventsStore.filter((ev) => {
    const evStart = new Date(ev.startAt).getTime();
    const evEnd = new Date(ev.endAt).getTime();
    return evEnd >= startDate.getTime() && evStart <= endDate.getTime();
  });
}

/**
 * Creates an event on the device calendar.
 */
export async function createDeviceEvent(event: {
  title: string;
  startAt: string;
  endAt: string;
  notes?: string;
  location?: string;
  isAllDay?: boolean;
}): Promise<string> {
  const newId = `dev-ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const unified: UnifiedCalendarEvent = {
    id: newId,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    type: "external",
    isAllDay: Boolean(event.isAllDay),
    sourceProvider: "device",
    notes: event.notes,
    location: event.location,
    busy: true,
  };

  try {
    const Calendar = await getCalendarModule();
    const calId = getSelectedDeviceCalendar();
    if (Calendar && typeof Calendar.createEventAsync === "function" && calId) {
      const nativeId = await Calendar.createEventAsync(calId, {
        title: event.title,
        startDate: new Date(event.startAt),
        endDate: new Date(event.endAt),
        allDay: Boolean(event.isAllDay),
        notes: event.notes,
        location: event.location,
      });
      return String(nativeId);
    }
  } catch {
    // fallback
  }

  localEventsStore.push(unified);
  return newId;
}

/**
 * Removes an event from the device calendar.
 */
export async function deleteDeviceEvent(eventId: string): Promise<void> {
  try {
    const Calendar = await getCalendarModule();
    if (Calendar && typeof Calendar.deleteEventAsync === "function") {
      const nativeId = eventId.replace(/^device-/, "");
      await Calendar.deleteEventAsync(nativeId);
    }
  } catch {
    // fallback
  }

  localEventsStore = localEventsStore.filter((ev) => ev.id !== eventId);
}
