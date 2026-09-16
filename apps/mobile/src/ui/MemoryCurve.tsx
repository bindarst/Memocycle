import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import {
  AiBrain01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import type { Plan } from "../database/entities";
import {
  averageRetention,
  curveHorizonMs,
  formatHorizon,
} from "../review/memoryModel";
import { Card, Pill, usePalette } from "./components";
import { AppIcon } from "./Icon";

const WIDTH = 340;
const HEIGHT = 140;
const LEFT = 14;
const TOP = 12;
const BOTTOM = 24;

export function MemoryCurve({ plans, now }: { plans: Plan[]; now: number }) {
  const c = usePalette();
  const active = plans.filter((plan) => plan.status === "active");
  const horizon = curveHorizonMs(active);
  const samples = Array.from({ length: 33 }, (_, index) => {
    const ratio = index / 32;
    const retention = active.length
      ? averageRetention(active, now + ratio * horizon)
      : Math.exp(Math.log(0.9) * ratio * 4);
    return { ratio, retention };
  });
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const point = (ratio: number, retention: number) => ({
    x: LEFT + ratio * (WIDTH - LEFT * 2),
    y: TOP + (1 - retention) * plotHeight,
  });
  const linePath = samples
    .map(({ ratio, retention }, index) => {
      const p = point(ratio, retention);
      return `${index ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
  const end = point(1, samples.at(-1)?.retention ?? 0.6);
  const areaPath = `${linePath} L${end.x},${HEIGHT - BOTTOM} L${LEFT},${HEIGHT - BOTTOM} Z`;
  const current = active.length
    ? Math.round(averageRetention(active, now) * 100)
    : null;
  const future = Math.round((samples.at(-1)?.retention ?? 0) * 100);
  const atRisk = active.filter(
    (plan) => averageRetention([plan], now) < 0.9,
  ).length;

  return (
    <Card style={{ overflow: "hidden" }}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
          <AppIcon icon={AiBrain01Icon} color={c.primary} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.textPrimary }]}>
            Courbe de l’oubli
          </Text>
        </View>
        {current !== null ? (
          <Pill tone={current >= 90 ? "success" : "warning"}>{current} %</Pill>
        ) : null}
      </View>

      <Svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        accessibilityLabel={
          current !== null
            ? `Rétention estimée ${current} pour cent, puis ${future} pour cent dans ${formatHorizon(horizon)}`
            : "Courbe de rétention théorique"
        }
      >
        <Defs>
          <LinearGradient id="memoryFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.primary} stopOpacity="0.2" />
            <Stop offset="1" stopColor={c.primary} stopOpacity="0.01" />
          </LinearGradient>
        </Defs>
        {[1, 0.9, 0.75, 0.5].map((value) => {
          const y = point(0, value).y;
          return (
            <Line
              key={value}
              x1={LEFT}
              x2={WIDTH - LEFT}
              y1={y}
              y2={y}
              stroke={c.chartGrid}
              strokeWidth={1}
              strokeDasharray={value === 0.9 ? "4 4" : undefined}
            />
          );
        })}
        <Path d={areaPath} fill="url(#memoryFill)" />
        <Path
          d={linePath}
          fill="none"
          stroke={c.primary}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle
          cx={LEFT}
          cy={point(0, samples[0]!.retention).y}
          r={4}
          fill={c.surface}
          stroke={c.primary}
          strokeWidth={2}
        />
        <SvgText x={LEFT} y={HEIGHT - 6} fill={c.textSecondary} fontSize={10}>
          Maintenant
        </SvgText>
        <SvgText
          x={WIDTH - LEFT}
          y={HEIGHT - 6}
          fill={c.textSecondary}
          fontSize={10}
          textAnchor="end"
        >
          + {formatHorizon(horizon)}
        </SvgText>
      </Svg>

      {atRisk > 0 ? (
        <View style={[styles.alert, { backgroundColor: c.warningSoft }]}>
          <AppIcon icon={AlertCircleIcon} color={c.warning} size={15} />
          <Text style={[styles.alertText, { color: c.warning }]}>
            {atRisk} {atRisk > 1 ? "cours à réviser" : "cours à réviser"}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  alertText: { fontSize: 13, fontWeight: "500" },
});

