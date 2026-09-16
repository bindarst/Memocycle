import React, { useEffect, useState, useRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
  Alert,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRightIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { AppIcon, type IconType } from "./Icon";
import { colors, radius, typography } from "../theme/tokens";
import { all, subscribe } from "../database/repository";
import type { Entity, EntityType } from "@memocycle/contracts";
import { useAuth } from "../auth/AuthProvider";

export function useEntities(type: EntityType) {
  const { userId } = useAuth();
  const [data, setData] = useState<Entity[]>([]);
  useEffect(() => {
    let active = true;
    const load = () =>
      void all(type, userId)
        .then((d) => {
          if (active) setData(d);
        })
        .catch(() => {});
    load();
    const stop = subscribe(load);
    return () => {
      active = false;
      stop();
    };
  }, [type, userId]);
  return data;
}

export function usePalette() {
  const system = useColorScheme();
  const settings = useEntities("userSettings")[0];
  const mode = settings?.appearance ?? "system";
  return colors[
    mode === "dark" || (mode === "system" && system === "dark")
      ? "dark"
      : "light"
  ];
}

export function Screen({
  children,
  scrollable = true,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={["top", "left", "right"]}
    >
      {scrollable ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            {
              paddingHorizontal: 16,
              paddingTop: 12,
              gap: 12,
              width: "100%",
              maxWidth: 680,
              alignSelf: "center",
              paddingBottom: 40,
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            {
              flex: 1,
              paddingHorizontal: 16,
              paddingTop: 12,
              gap: 12,
              width: "100%",
              maxWidth: 680,
              alignSelf: "center",
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  action,
  style,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 4,
          gap: 12,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        {onBack && (
          <IconButton
            icon={ArrowLeft01Icon}
            accessibilityLabel="Retour"
            onPress={onBack}
            variant="ghost"
          />
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            style={[
              typography.screenTitle,
              { color: c.textPrimary },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={[typography.caption, { color: c.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {action && <View style={{ flexDirection: "row", alignItems: "center" }}>{action}</View>}
    </View>
  );
}

export function Label({
  children,
  muted = false,
  large = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  large?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const c = usePalette();
  return (
    <Text
      style={[
        large ? typography.screenTitle : typography.body,
        {
          color: muted ? c.textSecondary : c.textPrimary,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
  variant = "default",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: "default" | "muted" | "outline";
}) {
  const c = usePalette();
  const bg =
    variant === "muted"
      ? c.surfaceMuted
      : variant === "outline"
      ? "transparent"
      : c.surface;

  const cardStyle: ViewStyle = {
    padding: 14,
    gap: 8,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: bg,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          { opacity: pressed ? 0.8 : 1 },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
  variant,
  size = "md",
  fullWidth = false,
  icon: Icon,
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: IconType;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const c = usePalette();

  const resolvedVariant: "primary" | "secondary" | "ghost" | "destructive" =
    variant ?? (danger ? "destructive" : secondary ? "secondary" : "primary");

  const sizeStyles = {
    sm: {
      height: 34,
      paddingHorizontal: 12,
      fontSize: 13,
      iconSize: 15,
      borderRadius: radius.button,
    },
    md: {
      height: 40,
      paddingHorizontal: 14,
      fontSize: 14,
      iconSize: 17,
      borderRadius: radius.button,
    },
    lg: {
      height: 46,
      paddingHorizontal: 18,
      fontSize: 15,
      iconSize: 19,
      borderRadius: radius.button,
    },
  }[size];

  const bg =
    resolvedVariant === "primary"
      ? c.primary
      : resolvedVariant === "destructive"
      ? c.danger
      : resolvedVariant === "ghost"
      ? "transparent"
      : c.surface;

  const textColor =
    resolvedVariant === "primary" || resolvedVariant === "destructive"
      ? c.onPrimary
      : resolvedVariant === "ghost"
      ? c.textSecondary
      : c.textPrimary;

  const borderWidth = resolvedVariant === "secondary" ? 1 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: sizeStyles.height,
          flexDirection: "row",
          gap: 6,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderRadius: sizeStyles.borderRadius,
          backgroundColor: bg,
          borderWidth,
          borderColor: c.border,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {Icon && (
        <AppIcon
          icon={Icon}
          size={sizeStyles.iconSize}
          color={textColor}
          strokeWidth={1.7}
        />
      )}
      <Text
        style={[
          {
            fontSize: sizeStyles.fontSize,
            fontWeight: "600",
            color: textColor,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = "outline",
  danger = false,
  disabled = false,
  size = 40,
  style,
}: {
  icon: IconType;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: "outline" | "ghost" | "secondary" | "primary" | "destructive";
  danger?: boolean;
  disabled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const isDestructive = danger || variant === "destructive";

  const bg =
    variant === "primary"
      ? c.primary
      : isDestructive
      ? c.dangerSoft
      : variant === "ghost"
      ? "transparent"
      : c.surface;

  const iconColor =
    variant === "primary"
      ? c.onPrimary
      : isDestructive
      ? c.danger
      : c.textPrimary;

  const borderWidth = variant === "outline" ? 1 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.button,
          borderWidth,
          borderColor: c.border,
          backgroundColor: bg,
          justifyContent: "center",
          alignItems: "center",
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <AppIcon icon={Icon} size={Math.round(size * 0.48)} color={iconColor} strokeWidth={1.8} />
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const c = usePalette();
  return (
    <TextInput
      placeholderTextColor={c.textSecondary}
      {...props}
      style={[
        {
          height: 40,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radius.button,
          paddingHorizontal: 12,
          color: c.textPrimary,
          backgroundColor: c.surface,
          fontSize: 14,
        },
        props.style,
      ]}
    />
  );
}

export function Textarea(props: TextInputProps) {
  const c = usePalette();
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor={c.textSecondary}
      {...props}
      style={[
        {
          minHeight: 80,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radius.button,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: c.textPrimary,
          backgroundColor: c.surface,
          fontSize: 14,
        },
        props.style,
      ]}
    />
  );
}

export function Badge({
  children,
  variant = "default",
  tone,
  style,
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning";
  tone?: "primary" | "success" | "warning" | "muted" | "destructive" | "neutral";
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const resolved = tone ?? variant;

  let bg = c.primarySoft;
  let color = c.primary;
  let border = 0;

  if (resolved === "success") {
    bg = c.successSoft;
    color = c.success;
  } else if (resolved === "warning") {
    bg = c.warningSoft;
    color = c.warning;
  } else if (resolved === "destructive") {
    bg = c.dangerSoft;
    color = c.danger;
  } else if (resolved === "secondary" || resolved === "muted" || resolved === "neutral") {
    bg = c.surfaceMuted;
    color = c.textSecondary;
  } else if (resolved === "outline") {
    bg = "transparent";
    color = c.textSecondary;
    border = 1;
  }

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          height: 22,
          paddingHorizontal: 8,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: border,
          borderColor: c.border,
          gap: 4,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color, letterSpacing: -0.1 }}>
        {children}
      </Text>
    </View>
  );
}

// Alias for backward compatibility
export const Pill = Badge;

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          backgroundColor: c.surfaceMuted,
          borderRadius: radius.button,
          padding: 2,
          height: 36,
          alignItems: "center",
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={opt.label}
            style={({ pressed }) => ({
              flex: 1,
              height: 32,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: radius.button - 2,
              backgroundColor: isSelected ? c.surface : "transparent",
              borderWidth: isSelected ? 1 : 0,
              borderColor: isSelected ? c.border : "transparent",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: isSelected ? "600" : "500",
                color: isSelected ? c.textPrimary : c.textSecondary,
              }}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  icon: Icon,
  rightText,
  rightBadge,
  onPress,
  danger = false,
  showChevron = true,
  rightComponent,
  style,
}: {
  title: string;
  subtitle?: string;
  icon?: IconType;
  rightText?: string;
  rightBadge?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  showChevron?: boolean;
  rightComponent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const content = (
    <View
      style={[
        {
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          paddingHorizontal: 14,
          backgroundColor: c.surface,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: c.border,
          gap: 12,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        {Icon && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              backgroundColor: danger ? c.dangerSoft : c.surfaceMuted,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AppIcon
              icon={Icon}
              size={17}
              color={danger ? c.danger : c.textPrimary}
              strokeWidth={1.8}
            />
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            style={[
              typography.bodyStrong,
              { color: danger ? c.danger : c.textPrimary },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                typography.caption,
                { color: c.textSecondary },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {rightText ? (
          <Text style={[typography.caption, { color: c.textSecondary }]}>
            {rightText}
          </Text>
        ) : null}
        {rightBadge}
        {rightComponent}
        {showChevron && onPress && (
          <AppIcon icon={ChevronRightIcon} size={16} color={c.textSecondary} strokeWidth={2} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => ({
          opacity: pressed ? 0.75 : 1,
        })}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export function SwitchRow({
  title,
  subtitle,
  icon: Icon,
  value,
  onValueChange,
  disabled = false,
  style,
}: {
  title: string;
  subtitle?: string;
  icon?: IconType;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          paddingHorizontal: 14,
          backgroundColor: c.surface,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: c.border,
          gap: 12,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        {Icon && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              backgroundColor: c.surfaceMuted,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AppIcon icon={Icon} size={17} color={c.textPrimary} strokeWidth={1.8} />
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[typography.bodyStrong, { color: c.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.caption, { color: c.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor={c.surface}
      />
    </View>
  );
}

export function Separator({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: c.border,
          marginVertical: 4,
          width: "100%",
        },
        style,
      ]}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: IconType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const c = usePalette();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 28,
        paddingHorizontal: 16,
        gap: 8,
      }}
    >
      {Icon && (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.button,
            backgroundColor: c.surfaceMuted,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
          }}
        >
          <AppIcon icon={Icon} size={22} color={c.textSecondary} strokeWidth={1.6} />
        </View>
      )}
      <Text style={[typography.sectionTitle, { color: c.textPrimary, textAlign: "center" }]}>
        {title}
      </Text>
      {description && (
        <Text style={[typography.caption, { color: c.textSecondary, textAlign: "center", maxWidth: 280 }]}>
          {description}
        </Text>
      )}
      {action && <View style={{ marginTop: 8 }}>{action}</View>}
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = usePalette();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[typography.label, { color: c.textSecondary }]}>
        {label}
      </Text>
      <Input accessibilityLabel={label} {...props} />
    </View>
  );
}

import { isZodLikeError, sanitizeErrorMessage } from "../utils/errors";
export { isZodLikeError, sanitizeErrorMessage };

export function ErrorText({ message }: { message?: string | null }) {
  const c = usePalette();
  if (!message) return null;
  const cleanMessage = sanitizeErrorMessage(message);
  return (
    <Text
      accessibilityRole="alert"
      style={[typography.caption, { color: c.danger, lineHeight: 18 }]}
    >
      {cleanMessage}
    </Text>
  );
}

export function useAction() {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (isZodLikeError(e)) {
        setError("Vérifie les informations saisies.");
      } else if (e instanceof Error) {
        setError(sanitizeErrorMessage(e.message));
      } else {
        setError("Impossible de terminer cette action.");
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run };
}

export function confirm(title: string, message: string, action: () => void) {
  Alert.alert(title, message, [
    { text: "Annuler", style: "cancel" },
    { text: "Confirmer", onPress: action },
  ]);
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  const c = usePalette();
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flex: 1, gap: 1 }}>
        {eyebrow ? (
          <Text style={[typography.caption, { color: c.primary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[typography.sectionTitle, { color: c.textPrimary }]}>
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
});
