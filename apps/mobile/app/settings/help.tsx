import React, { useMemo, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import {
  Analytics01Icon,
  Book01Icon,
  Calendar01Icon,
  Cancel01Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  Clock01Icon,
  HelpCircleIcon,
  Notification01Icon,
  RefreshIcon,
  Search01Icon,
  Shield01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import {
  Button,
  Card,
  Input,
  Screen,
  ScreenHeader,
  SectionTitle,
  usePalette,
} from "../../src/ui/components";
import { AppIcon, type IconType } from "../../src/ui/Icon";
import {
  filterHelpSections,
  helpSections,
  type HelpDestination,
  type HelpTopic,
} from "../../src/help/helpContent";

const icons: Record<string, IconType> = {
  start: SparklesIcon,
  organize: Book01Icon,
  review: RefreshIcon,
  focus: Clock01Icon,
  planning: Calendar01Icon,
  progress: Analytics01Icon,
  sync: RefreshIcon,
  reminders: Notification01Icon,
  privacy: Shield01Icon,
  trouble: HelpCircleIcon,
};

const destinations: Record<HelpDestination, Href> = {
  today: "/(tabs)/today",
  library: "/(tabs)/library",
  calendar: "/(tabs)/calendar",
  stats: "/stats",
  studySettings: "/settings/study",
  notifications: "/settings/notifications",
  calendarSettings: "/settings/calendar",
  devices: "/settings/devices",
  account: "/settings/account",
};

export default function HelpScreen() {
  const c = usePalette();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sections = useMemo(() => filterHelpSections(query, category), [query, category]);
  const count = sections.reduce((total, section) => total + section.topics.length, 0);

  const openDestination = (destination: HelpDestination) => {
    Keyboard.dismiss();
    router.push(destinations[destination]);
  };

  const renderTopic = (topic: HelpTopic, last: boolean) => {
    const expanded = expandedId === topic.id;
    return (
      <View key={topic.id} style={!last ? { borderBottomWidth: 1, borderBottomColor: c.border } : undefined}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={topic.question}
          accessibilityState={{ expanded }}
          onPress={() => { Keyboard.dismiss(); setExpandedId(expanded ? null : topic.id); }}
          style={({ pressed }) => [styles.questionRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.question, { color: c.textPrimary }]}>{topic.question}</Text>
          <AppIcon icon={expanded ? ChevronUpIcon : ChevronDownIcon} size={18} color={c.textSecondary} />
        </Pressable>
        {expanded && (
          <View style={styles.answer}>
            <Text style={[styles.answerText, { color: c.textSecondary }]}>{topic.answer}</Text>
            {topic.steps?.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: c.primarySoft }]}>
                  <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700" }}>{index + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: c.textPrimary }]}>{step}</Text>
              </View>
            ))}
            {topic.destination && topic.actionLabel && (
              <Button
                size="sm"
                variant="secondary"
                title={topic.actionLabel}
                onPress={() => openDestination(topic.destination!)}
                style={{ marginTop: 4 }}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Aide" subtitle="Guide et réponses" onBack={() => router.back()} />

      <Card style={[styles.hero, { backgroundColor: c.primarySoft, borderColor: c.primarySoft }]}>
        <View style={[styles.heroIcon, { backgroundColor: c.surface }]}>
          <AppIcon icon={HelpCircleIcon} color={c.primary} size={24} />
        </View>
        <Text style={[styles.heroTitle, { color: c.textPrimary }]}>On avance ensemble.</Text>
        <Text style={[styles.heroText, { color: c.textSecondary }]}>
          Tout comprendre, du premier cours aux révisions intelligentes. Ce guide est disponible même sans réseau.
        </Text>
        <View style={styles.quickActions}>
          <Button size="sm" title="Mes cours" variant="secondary" onPress={() => openDestination("library")} />
          <Button size="sm" title="Aujourd’hui" variant="secondary" onPress={() => openDestination("today")} />
          <Button size="sm" title="Calendrier" variant="secondary" onPress={() => openDestination("calendar")} />
        </View>
      </Card>

      <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.border }]}>
        <AppIcon icon={Search01Icon} size={18} color={c.textSecondary} />
        <Input
          accessibilityLabel="Rechercher dans l’aide"
          placeholder="Question, fonctionnalité, problème…"
          value={query}
          onChangeText={(value) => { setQuery(value); setExpandedId(null); }}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
            hitSlop={10}
            onPress={() => { setQuery(""); setExpandedId(null); }}
          >
            <AppIcon icon={Cancel01Icon} size={18} color={c.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {[{ id: "all", title: "Tout" }, ...helpSections].map((item) => {
          const selected = category === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => { Keyboard.dismiss(); setCategory(item.id); setExpandedId(null); }}
              style={({ pressed }) => [
                styles.filter,
                { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.border, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={{ color: selected ? c.onPrimary : c.textSecondary, fontSize: 12, fontWeight: "600" }}>
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={{ fontSize: 12, color: c.textSecondary }}>
        {count} réponse{count > 1 ? "s" : ""} {query.trim() ? `pour « ${query.trim()} »` : "à explorer"}
      </Text>

      {sections.length === 0 ? (
        <Card style={{ alignItems: "center", padding: 24, gap: 8 }}>
          <AppIcon icon={Search01Icon} size={24} color={c.textSecondary} />
          <Text style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700" }}>Aucun résultat</Text>
          <Text style={{ color: c.textSecondary, textAlign: "center", lineHeight: 20 }}>
            Essaie un autre mot ou choisis « Tout » pour chercher dans toutes les rubriques.
          </Text>
          <Button size="sm" variant="secondary" title="Tout afficher" onPress={() => { setQuery(""); setCategory("all"); }} />
        </Card>
      ) : (
        sections.map((section) => {
          const Icon = icons[section.id] ?? HelpCircleIcon;
          return (
            <View key={section.id} style={{ gap: 8 }}>
              <SectionTitle title={section.title} eyebrow={section.subtitle} />
              <Card style={{ paddingHorizontal: 14, paddingVertical: 2, gap: 0 }}>
                <View style={styles.sectionAccent}>
                  <View style={[styles.sectionIcon, { backgroundColor: c.primarySoft }]}>
                    <AppIcon icon={Icon} color={c.primary} size={17} />
                  </View>
                  <Text style={{ color: c.textSecondary, fontSize: 12 }}>
                    {section.topics.length} question{section.topics.length > 1 ? "s" : ""}
                  </Text>
                </View>
                {section.topics.map((topic, index) => renderTopic(topic, index === section.topics.length - 1))}
              </Card>
            </View>
          );
        })
      )}

      <Card style={{ gap: 10, marginTop: 6 }}>
        <Text style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700" }}>Tes données et tes droits</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>
          Consulte les documents intégrés à l’application, même hors ligne.
        </Text>
        <Button fullWidth size="sm" variant="secondary" title="Confidentialité" onPress={() => router.push("/legal/privacy")} />
        <Button fullWidth size="sm" variant="secondary" title="Conditions d’utilisation" onPress={() => router.push("/legal/terms")} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, gap: 10 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 21, fontWeight: "700", letterSpacing: -0.3 },
  heroText: { fontSize: 14, lineHeight: 21 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  searchBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingLeft: 13, paddingRight: 12, minHeight: 50, gap: 8 },
  searchInput: { flex: 1, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0, height: 48 },
  filters: { gap: 8, paddingVertical: 2, paddingRight: 12 },
  filter: { minHeight: 36, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  sectionAccent: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, paddingBottom: 2 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  questionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  question: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  answer: { gap: 10, paddingBottom: 16, paddingRight: 4 },
  answerText: { fontSize: 14, lineHeight: 21 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19, paddingTop: 2 },
});
