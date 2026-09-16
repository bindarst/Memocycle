export const colors = {
  light: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F5F9",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    primary: "#2563EB",
    onPrimary: "#FFFFFF",
    primarySoft: "#EFF6FF",
    success: "#10B981",
    successSoft: "#ECFDF5",
    warning: "#F59E0B",
    warningSoft: "#FFFBEB",
    danger: "#EF4444",
    dangerSoft: "#FEF2F2",
    chartGrid: "#E2E8F0",
  },
  dark: {
    background: "#09090B",
    surface: "#18181B",
    surfaceMuted: "#27272A",
    textPrimary: "#F8FAFC",
    textSecondary: "#A1A1AA",
    border: "#27272A",
    primary: "#3B82F6",
    onPrimary: "#FFFFFF",
    primarySoft: "#1E293B",
    success: "#10B981",
    successSoft: "#064E3B",
    warning: "#F59E0B",
    warningSoft: "#451A03",
    danger: "#EF4444",
    dangerSoft: "#450A0A",
    chartGrid: "#27272A",
  },
};

export const typography = {
  screenTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 21,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: "600" as const,
    lineHeight: 21,
  },
  caption: {
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 18,
  },
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  card: 14,
  button: 10,
  pill: 999,
};
