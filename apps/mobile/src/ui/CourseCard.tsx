import React from "react";
import { router } from "expo-router";
import { View, Text } from "react-native";
import {
  Book01Icon,
  ChevronRightIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { Card, Pill, useEntities, usePalette } from "./components";
import { AppIcon } from "./Icon";
import type { Course, Plan } from "../database/entities";
import { displayDate, lateness } from "../utils/dates";

export function CourseCard({ course, plan }: { course: Course; plan?: Plan }) {
  const c = usePalette();
  const subject = useEntities("subject").find((s) => s.id === course.subjectId);
  const overdue =
    !!plan?.nextReviewAt && new Date(plan.nextReviewAt).getTime() < Date.now();

  const stepText = plan?.nextReviewAt
    ? plan.schedulerType === "fsrs"
      ? `Rép. ${(plan.reps ?? 0) + 1}`
      : `Rév. ${plan.currentStep}/6`
    : null;

  const dateText = plan?.nextReviewAt
    ? overdue
      ? lateness(plan.nextReviewAt)
      : displayDate(plan.nextReviewAt)
    : course.status === "completed"
    ? "Terminé"
    : course.status === "archived"
    ? "Archivé"
    : "Non étudié";

  return (
    <Card
      onPress={() => router.push(`/course/${course.id}`)}
      style={{ paddingVertical: 12, paddingHorizontal: 14 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: c.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppIcon icon={Book01Icon} color={c.primary} size={18} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: c.textPrimary,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {course.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{ fontSize: 13, color: c.textSecondary }}
              numberOfLines={1}
            >
              {subject?.title ? String(subject.title) : "Sans matière"}
            </Text>
            {course.estimatedReviewMinutes ? (
              <>
                <Text style={{ fontSize: 12, color: c.border }}>•</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AppIcon icon={Clock01Icon} color={c.textSecondary} size={12} />
                  <Text style={{ fontSize: 12, color: c.textSecondary }}>
                    {course.estimatedReviewMinutes} min
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        <View style={{ alignItems: "flex-end", gap: 3 }}>
          {overdue ? (
            <Pill tone="warning">En retard</Pill>
          ) : (
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: plan?.nextReviewAt ? c.textPrimary : c.textSecondary,
              }}
            >
              {dateText}
            </Text>
          )}
          {stepText && !overdue && (
            <Text style={{ fontSize: 11, color: c.textSecondary }}>
              {stepText}
            </Text>
          )}
        </View>

        <AppIcon icon={ChevronRightIcon} size={16} color={c.textSecondary} />
      </View>
    </Card>
  );
}

