import React from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home01Icon,
  Book01Icon,
  Calendar01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { usePalette } from "../../src/ui/components";
import { AppIcon } from "../../src/ui/Icon";

export default function Layout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 56 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Aujourd’hui",
          tabBarIcon: ({ color, size }) => (
            <AppIcon icon={Home01Icon} color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Cours",
          tabBarIcon: ({ color, size }) => (
            <AppIcon icon={Book01Icon} color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Planning",
          tabBarIcon: ({ color, size }) => (
            <AppIcon icon={Calendar01Icon} color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <AppIcon icon={UserIcon} color={color} size={size ?? 22} />
          ),
        }}
      />
    </Tabs>
  );
}

