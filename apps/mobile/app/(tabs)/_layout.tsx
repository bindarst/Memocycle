import { Tabs } from "expo-router";
import { CalendarDays, House, LibraryBig, UserRound } from "lucide-react-native";
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
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
        tabBarItemStyle: { paddingTop: 7 },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 68,
          paddingBottom: 5,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Aujourd’hui",
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Cours",
          tabBarIcon: ({ color, size }) => <LibraryBig color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Planning",
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
