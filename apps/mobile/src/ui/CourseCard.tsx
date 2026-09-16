import React from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { BookOpen, ChevronRight, Clock3, BrainCircuit } from "lucide-react-native";
import { Card, Label, Button, Pill, useEntities, usePalette } from "./components";
import type { Course, Plan } from "../database/entities";
import { displayDate, lateness } from "../utils/dates";
import { estimatePlanRetention } from "../review/fsrsScheduler";

export function CourseCard({ course, plan }: { course: Course; plan?: Plan }) {
  const c = usePalette();
  const subject = useEntities("subject").find((s) => s.id === course.subjectId);
  const overdue =
    !!plan?.nextReviewAt && new Date(plan.nextReviewAt).getTime() < Date.now();

  const retentionPercent = plan
    ? Math.round(estimatePlanRetention(plan, Date.now()) * 100)
    : null;

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            backgroundColor: c.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookOpen color={c.primary} size={23} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Label style={{ fontWeight: "800", fontSize: 17 }}>
            {course.title}
          </Label>
          <Label muted style={{ fontSize: 13 }}>
            {String(subject?.title ?? "Sans matière")}
          </Label>
        </View>
        {overdue ? (
          <Pill tone="warning">En retard</Pill>
        ) : plan?.nextReviewAt ? (
          <Pill tone="primary">Planifié</Pill>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Clock3 color={c.textSecondary} size={15} />
          <Label muted style={{ fontSize: 13 }}>
            ~{course.estimatedReviewMinutes || 10} min
          </Label>
        </View>

        {retentionPercent !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <BrainCircuit color={c.textSecondary} size={15} />
            <Label muted style={{ fontSize: 13 }}>
              Mémoire : {retentionPercent} %
            </Label>
          </View>
        )}
      </View>

      {plan?.nextReviewAt ? (
        <View style={{ gap: 2 }}>
          <Label muted style={{ fontSize: 13 }}>
            {plan.schedulerType === "fsrs"
              ? `Répétition ${(plan.reps ?? 0) + 1}`
              : `Révision ${plan.currentStep}/6`}
          </Label>
          <Label style={{ fontWeight: "700" }}>
            {new Date(plan.nextReviewAt).getTime() < Date.now()
              ? lateness(plan.nextReviewAt)
              : displayDate(plan.nextReviewAt)}
          </Label>
        </View>
      ) : (
        <Label muted>
          {course.status === "completed"
            ? "Cycle terminé"
            : course.status === "archived"
              ? "Archivé"
              : "Pas encore étudié"}
        </Label>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {plan?.nextReviewAt && (
          <View style={{ flex: 1 }}>
            <Button
              title="Session"
              onPress={() => router.push(`/session/${course.id}`)}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button
            secondary
            icon={ChevronRight}
            title={plan?.nextReviewAt ? "Fiche" : "Ouvrir le cours"}
            onPress={() => router.push(`/course/${course.id}`)}
          />
        </View>
      </View>
    </Card>
  );
}
