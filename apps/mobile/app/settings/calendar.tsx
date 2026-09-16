import React, { useState } from "react";
import { router } from "expo-router";
import { View, Text, Share, Alert } from "react-native";
import {
  ArrowLeft01Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons";
import {
  Screen,
  Label,
  Card,
  Button,
  IconButton,
  SegmentedControl,
  usePalette,
  confirm,
} from "../../src/ui/components";
import {
  isDeviceCalendarConnected,
  requestDeviceCalendarPermission,
  disconnectDeviceCalendar,
  getSelectedDeviceCalendar,
} from "../../src/calendar/localCalendarService";
import {
  exportCalendarToIcs,
} from "../../src/calendar/calendarService";
import { useEntities } from "../../src/ui/components";
import type { Course, Exam, Plan, StudySession } from "../../src/database/entities";

export default function CalendarSettings() {
  const c = usePalette();

  const plans = useEntities("reviewPlan") as Plan[];
  const courses = useEntities("course") as Course[];
  const exams = useEntities("exam") as Exam[];
  const sessions = useEntities("studySession") as StudySession[];

  // Local device calendar state
  const [deviceConnected, setDeviceConnected] = useState(isDeviceCalendarConnected());
  const [deviceSyncMode, setDeviceSyncMode] = useState<"disabled" | "export_only" | "two_way">("two_way");

  // Google Calendar mock/service state (connected via OAuth)
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleSyncMode, setGoogleSyncMode] = useState<"disabled" | "export_only" | "two_way">("export_only");

  // Microsoft Outlook mock/service state
  const [msConnected, setMsConnected] = useState(false);
  const [msSyncMode, setMsSyncMode] = useState<"disabled" | "export_only" | "two_way">("export_only");

  // Availability mode
  const [availabilityMode, setAvailabilityMode] = useState<"morning" | "afternoon" | "evening" | "custom">("evening");

  const handleToggleDeviceCalendar = async () => {
    if (deviceConnected) {
      confirm(
        "Déconnexion",
        "Déconnecter le calendrier du téléphone ?",
        () => {
          disconnectDeviceCalendar();
          setDeviceConnected(false);
        },
      );
    } else {
      const res = await requestDeviceCalendarPermission();
      if (res.granted) {
        setDeviceConnected(true);
      }
    }
  };

  const handleToggleGoogle = () => {
    if (googleConnected) {
      confirm(
        "Déconnexion",
        "Déconnecter Google Agenda ?",
        () => {
          setGoogleConnected(false);
        },
      );
    } else {
      // In production, launches OAuth web authentication
      setGoogleConnected(true);
    }
  };

  const handleToggleMicrosoft = () => {
    if (msConnected) {
      confirm(
        "Déconnexion",
        "Déconnecter Outlook ?",
        () => {
          setMsConnected(false);
        },
      );
    } else {
      setMsConnected(true);
    }
  };

  const handleExportIcs = async () => {
    const icsContent = exportCalendarToIcs({
      plans,
      courses,
      exams,
      studySessions: sessions,
    });

    try {
      await Share.share({
        title: "MémoCycle Calendrier",
        message: icsContent,
      });
    } catch {
      Alert.alert("Export", "Le fichier de calendrier est prêt.");
    }
  };

  const syncOptions = [
    { label: "Désactivée", value: "disabled" as const },
    { label: "Exporter", value: "export_only" as const },
    { label: "Bidirectionnelle", value: "two_way" as const },
  ];

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton
          icon={ArrowLeft01Icon}
          onPress={() => router.back()}
          accessibilityLabel="Retour"
        />
        <Label large>Calendriers</Label>
      </View>

      {/* Google Calendar Card */}
      <Card style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
              Google Agenda
            </Text>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              {googleConnected ? "Compte connecté" : "Non connecté"}
            </Text>
          </View>
          <Button
            size="sm"
            variant={googleConnected ? "ghost" : "primary"}
            title={googleConnected ? "Déconnecter" : "Connecter"}
            onPress={handleToggleGoogle}
          />
        </View>

        {googleConnected && (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
              Mode de synchronisation
            </Text>
            <SegmentedControl
              options={syncOptions}
              value={googleSyncMode}
              onChange={setGoogleSyncMode}
            />
          </View>
        )}
      </Card>

      {/* Microsoft Outlook Card */}
      <Card style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
              Microsoft Outlook
            </Text>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              {msConnected ? "Compte connecté" : "Non connecté"}
            </Text>
          </View>
          <Button
            size="sm"
            variant={msConnected ? "ghost" : "primary"}
            title={msConnected ? "Déconnecter" : "Connecter"}
            onPress={handleToggleMicrosoft}
          />
        </View>

        {msConnected && (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
              Mode de synchronisation
            </Text>
            <SegmentedControl
              options={syncOptions}
              value={msSyncMode}
              onChange={setMsSyncMode}
            />
          </View>
        )}
      </Card>

      {/* Device Phone Calendar Card */}
      <Card style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
              Calendrier du téléphone
            </Text>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              {deviceConnected
                ? getSelectedDeviceCalendar() ?? "Calendrier local actif"
                : "Non connecté"}
            </Text>
          </View>
          <Button
            size="sm"
            variant={deviceConnected ? "ghost" : "primary"}
            title={deviceConnected ? "Déconnecter" : "Connecter"}
            onPress={handleToggleDeviceCalendar}
          />
        </View>

        {deviceConnected && (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
              Mode de synchronisation
            </Text>
            <SegmentedControl
              options={syncOptions}
              value={deviceSyncMode}
              onChange={setDeviceSyncMode}
            />
          </View>
        )}
      </Card>

      {/* Study Availability Section */}
      <Card style={{ padding: 14, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
          Disponibilités d’étude
        </Text>
        <SegmentedControl
          options={[
            { label: "Matin", value: "morning" },
            { label: "Après-midi", value: "afternoon" },
            { label: "Soir", value: "evening" },
            { label: "Personnalisé", value: "custom" },
          ]}
          value={availabilityMode}
          onChange={setAvailabilityMode}
        />
      </Card>

      {/* Export ICS */}
      <Card style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
              Exporter le planning
            </Text>
            <Text style={{ fontSize: 13, color: c.textSecondary }}>
              Format universel iCalendar (.ics)
            </Text>
          </View>
          <Button
            size="sm"
            variant="secondary"
            title="Exporter .ics"
            icon={Download01Icon}
            onPress={handleExportIcs}
          />
        </View>
      </Card>
    </Screen>
  );
}

