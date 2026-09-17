import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { File01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { Button, Card, Screen, ScreenHeader, usePalette } from "../ui/components";
import { AppIcon } from "../ui/Icon";
import type { LegalDocument } from "./legalContent";

export function LegalDocumentView({ content, kind }: { content: LegalDocument; kind: "privacy" | "terms" }) {
  const c = usePalette();
  const Icon = kind === "privacy" ? Shield01Icon : File01Icon;
  return (
    <Screen>
      <ScreenHeader title={content.title} subtitle="MémoCycle · 17 septembre 2026" onBack={() => router.back()} />
      <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primarySoft, padding: 18, gap: 10 }}>
        <AppIcon icon={Icon} color={c.primary} size={26} />
        <Text style={{ color: c.textPrimary, fontSize: 17, fontWeight: "700", lineHeight: 23 }}>
          {kind === "privacy" ? "Tes données, en toute clarté" : "Un cadre simple pour étudier"}
        </Text>
        <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 21 }}>{content.lead}</Text>
      </Card>

      <Card style={{ backgroundColor: c.warningSoft, borderColor: c.warningSoft, padding: 14 }}>
        <Text style={{ color: c.textPrimary, fontSize: 13, lineHeight: 19 }}>
          Document à finaliser avant publication publique : identité et contact de l’éditeur, ainsi que les mentions juridiques indiquées ci-dessous.
        </Text>
      </Card>

      {content.sections.map((section) => (
        <Card key={section.title} style={{ padding: 16, gap: 10 }}>
          <Text accessibilityRole="header" style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700", lineHeight: 22 }}>
            {section.title}
          </Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={{ color: c.textSecondary, fontSize: 14, lineHeight: 21 }}>
              {paragraph}
            </Text>
          ))}
          {section.bullets?.map((bullet) => (
            <View key={bullet} style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.primary, marginTop: 8 }} />
              <Text style={{ flex: 1, color: c.textSecondary, fontSize: 14, lineHeight: 21 }}>{bullet}</Text>
            </View>
          ))}
        </Card>
      ))}

      <Button
        fullWidth
        variant="secondary"
        title={kind === "privacy" ? "Lire les conditions d’utilisation" : "Lire la confidentialité"}
        onPress={() => router.push(kind === "privacy" ? "/legal/terms" : "/legal/privacy")}
      />
    </Screen>
  );
}
