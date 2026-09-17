export function examTimestamp(day: Date, time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match || !Number.isFinite(day.getTime()))
    throw new Error("Choisis une date et une heure valides.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
  if (date.getHours() !== hour || date.getMinutes() !== minute)
    throw new Error("Cette heure n’existe pas à cette date.");
  return date.toISOString();
}
