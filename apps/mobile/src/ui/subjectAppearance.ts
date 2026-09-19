import {
  Book01Icon,
  FlaskConicalIcon,
  LanguagesIcon,
  Calculator01Icon,
  ComputerIcon,
  PaintBrush01Icon,
  MusicNote01Icon,
  Globe02Icon,
  JusticeScale01Icon,
  HealthIcon,
  Briefcase01Icon,
  AiProgrammingIcon,
} from "@hugeicons/core-free-icons";
import type { IconType } from "./Icon";

export const SUBJECT_CATEGORIES: ReadonlyArray<{
  key: string;
  label: string;
  icon: IconType;
}> = [
  { key: "book", label: "Général", icon: Book01Icon },
  { key: "math", label: "Maths", icon: Calculator01Icon },
  { key: "science", label: "Sciences", icon: FlaskConicalIcon },
  { key: "language", label: "Langues", icon: LanguagesIcon },
  { key: "computer", label: "Informatique", icon: ComputerIcon },
  { key: "humanities", label: "Sciences humaines", icon: Globe02Icon },
  { key: "arts", label: "Arts", icon: PaintBrush01Icon },
  { key: "music", label: "Musique", icon: MusicNote01Icon },
  { key: "law", label: "Droit", icon: JusticeScale01Icon },
  { key: "health", label: "Santé", icon: HealthIcon },
  { key: "economics", label: "Économie", icon: Briefcase01Icon },
  { key: "engineering", label: "Ingénierie", icon: AiProgrammingIcon },
];

export const SUBJECT_COLORS = [
  { key: "blue", label: "Bleu", color: "#0F62FE" },
  { key: "cyan", label: "Cyan", color: "#1192E8" },
  { key: "teal", label: "Sarcelle", color: "#007D79" },
  { key: "green", label: "Vert", color: "#198038" },
  { key: "amber", label: "Ambre", color: "#F1C21B" },
  { key: "orange", label: "Orange", color: "#BA4E00" },
  { key: "red", label: "Rouge", color: "#DA1E28" },
  { key: "purple", label: "Violet", color: "#8A3FFC" },
  { key: "pink", label: "Rose", color: "#D02670" },
  { key: "slate", label: "Ardoise", color: "#525252" },
] as const;

export function subjectCategory(key: unknown) {
  return SUBJECT_CATEGORIES.find((item) => item.key === key) ?? SUBJECT_CATEGORIES[0]!;
}

export function subjectColor(key: unknown) {
  return SUBJECT_COLORS.find((item) => item.key === key) ?? SUBJECT_COLORS[0]!;
}
