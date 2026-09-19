import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { addDays, addMonths, format, nextMonday, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { AppIcon } from "./Icon";
import { Field, usePalette } from "./components";

const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

export function ExamDatePicker({
  value,
  onChange,
  time,
  onTimeChange,
}: {
  value: Date;
  onChange: (value: Date) => void;
  time: string;
  onTimeChange: (value: string) => void;
}) {
  const c = usePalette();
  const [expanded, setExpanded] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value));
  const firstDay = startOfWeek(visibleMonth, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, index) => addDays(firstDay, index));

  const chooseDay = (day: Date) => {
    onChange(day);
    setVisibleMonth(startOfMonth(day));
    setExpanded(false);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: "600" }}>Date de l’examen</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choisir la date de l’examen, ${format(value, "d MMMM yyyy", { locale: fr })}`}
        onPress={() => { setVisibleMonth(startOfMonth(value)); setExpanded((current) => !current); }}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface }}
      >
        <AppIcon icon={Calendar01Icon} color={c.primary} size={19} />
        <Text style={{ flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: "600" }}>
          {format(value, "EEEE d MMMM yyyy", { locale: fr })}
        </Text>
        <Text style={{ color: c.primary, fontSize: 13, fontWeight: "600" }}>Changer</Text>
      </Pressable>

      {expanded && (
        <View style={{ gap: 12, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mois précédent" hitSlop={10} onPress={() => setVisibleMonth(addMonths(visibleMonth, -1))} style={{ padding: 8 }}>
              <AppIcon icon={ArrowLeft01Icon} color={c.textPrimary} size={18} />
            </Pressable>
            <Text style={{ color: c.textPrimary, fontWeight: "700", fontSize: 15 }}>{format(visibleMonth, "MMMM yyyy", { locale: fr })}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Mois suivant" hitSlop={10} onPress={() => setVisibleMonth(addMonths(visibleMonth, 1))} style={{ padding: 8 }}>
              <AppIcon icon={ArrowRight01Icon} color={c.textPrimary} size={18} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row" }}>
            {weekDays.map((label, index) => <Text key={index} style={{ flex: 1, textAlign: "center", color: c.textSecondary, fontSize: 12 }}>{label}</Text>)}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {days.map((day) => {
              const selected = day.toDateString() === value.toDateString();
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              return (
                <Pressable
                  key={day.toISOString()}
                  accessibilityRole="button"
                  accessibilityLabel={format(day, "EEEE d MMMM yyyy", { locale: fr })}
                  accessibilityState={{ selected }}
                  onPress={() => chooseDay(day)}
                  style={{ width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: selected ? c.primary : "transparent" }}
                >
                  <Text style={{ color: selected ? c.onPrimary : inMonth ? c.textPrimary : c.textSecondary, fontWeight: selected ? "700" : "500" }}>{day.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[{ label: "Aujourd’hui", offset: 0 }, { label: "Demain", offset: 1 }, { label: "+7 jours", offset: 7 }, { label: "+14 jours", offset: 14 }, { label: "+1 mois", offset: 30 }].map(({ label, offset }) => (
              <Pressable key={label} accessibilityRole="button" onPress={() => chooseDay(addDays(new Date(), offset))} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: c.primarySoft }}>
                <Text style={{ color: c.primary, fontSize: 12, fontWeight: "600" }}>{label}</Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => chooseDay(nextMonday(new Date()))} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: c.primarySoft }}>
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: "600" }}>Lundi prochain</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Field label="Heure (HH:mm)" value={time} onChangeText={onTimeChange} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {["09:00", "14:00", "18:00"].map((hour) => (
            <Pressable key={hour} accessibilityRole="button" accessibilityLabel={`Choisir ${hour}`} onPress={() => onTimeChange(hour)} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: time === hour ? c.primary : c.border, backgroundColor: time === hour ? c.primarySoft : c.surface }}>
              <Text style={{ color: time === hour ? c.primary : c.textSecondary, fontSize: 13, fontWeight: "600" }}>{hour}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
