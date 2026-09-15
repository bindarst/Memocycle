import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
export const displayDate = (s: string) =>
  format(new Date(s), "EEEE d MMMM · HH:mm", { locale: fr });
export const dayKey = (d = new Date()) => format(d, "yyyy-MM-dd");
export const lateness = (s: string) =>
  `En retard de ${formatDistanceToNow(new Date(s), { locale: fr })}`;
