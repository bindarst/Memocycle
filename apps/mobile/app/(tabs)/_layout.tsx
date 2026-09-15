import { Tabs } from "expo-router";
import { usePalette } from "../../src/ui/components";
export default function Layout() {
  const c = usePalette();
  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Aujourd’hui" }} />
      <Tabs.Screen name="library" options={{ title: "Bibliothèque" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendrier" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
