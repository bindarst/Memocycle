import React, { useEffect, useState, useRef } from "react";
import { ZodError } from 'zod';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "../theme/tokens";
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
export function Screen({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 24,
          gap: 20,
          width: "100%",
          maxWidth: 720,
          alignSelf: "center",
          paddingBottom: 48,
        }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Label({
  children,
  muted = false,
  large = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
  large?: boolean;
}) {
  const c = usePalette();
  return (
    <Text
      style={{
        color: muted ? c.textSecondary : c.textPrimary,
        fontSize: large ? 28 : 16,
        lineHeight: large ? 36 : 24,
        fontWeight: large ? "700" : "400",
      }}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return (
    <View
      style={{
        padding: 20,
        gap: 12,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: "center",
        alignItems: "center",
        padding: 12,
        borderRadius: radius.button,
        backgroundColor: secondary ? c.surface : danger ? c.danger : c.primary,
        borderWidth: secondary ? 1 : 0,
        borderColor: c.border,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: secondary ? c.textPrimary : c.background,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = usePalette();
  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textSecondary}
        {...props}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          padding: 14,
          color: c.textPrimary,
          backgroundColor: c.surface,
          fontSize: 16,
          minHeight: 48,
        }}
      />
    </View>
  );
}
export function ErrorText({ message }: { message: string }) {
  const c = usePalette();
  return message ? (
    <Text
      accessibilityRole="alert"
      style={{ color: c.danger, fontSize: 14, lineHeight: 20 }}
    >
      {message}
    </Text>
  ) : null;
}
export function useAction() {
  const locked=useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current=true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ZodError ? 'Vérifie les champs obligatoires, les dates et les valeurs saisies.' : e instanceof Error ? e.message : "Impossible de terminer cette action.",
      );
    } finally {
      locked.current=false;
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
