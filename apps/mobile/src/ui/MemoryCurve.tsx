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
import { BrainCircuit, Sparkles } from "lucide-react-native";
import type { Plan } from "../database/entities";
import {
  averageRetention,
  curveHorizonMs,
  formatHorizon,
} from "../review/memoryModel";
import { Card, Pill, usePalette } from "./components";

const WIDTH = 340;
const HEIGHT = 168;
const LEFT = 14;
const TOP = 16;
const BOTTOM = 30;

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
  const current = Math.round(averageRetention(active, now) * 100);
  const future = Math.round((samples.at(-1)?.retention ?? 0) * 100);
  const atRisk = active.filter(
    (plan) => averageRetention([plan], now) < 0.9,
  ).length;

  return (
    <Card style={{ overflow: "hidden" }}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
          <BrainCircuit color={c.primary} size={24} strokeWidth={2.1} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.primary }]}>MÉMOIRE EN DIRECT</Text>
          <Text style={[styles.title, { color: c.textPrimary }]}>Courbe de l’oubli</Text>
        </View>
        <Pill tone={current >= 90 ? "success" : "warning"}>{current} %</Pill>
      </View>

      <Svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        accessibilityLabel={`Rétention estimée maintenant ${current} pour cent, puis ${future} pour cent dans ${formatHorizon(horizon)}`}
      >
        <Defs>
          <LinearGradient id="memoryFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.primary} stopOpacity="0.28" />
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
              strokeDasharray={value === 0.9 ? "5 5" : undefined}
            />
          );
        })}
        <Path d={areaPath} fill="url(#memoryFill)" />
        <Path
          d={linePath}
          fill="none"
          stroke={c.primary}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={LEFT} cy={point(0, samples[0]!.retention).y} r={6} fill={c.accent} stroke={c.primary} strokeWidth={3} />
        <SvgText x={LEFT} y={HEIGHT - 7} fill={c.textSecondary} fontSize={11}>Maintenant</SvgText>
        <SvgText x={WIDTH - LEFT} y={HEIGHT - 7} fill={c.textSecondary} fontSize={11} textAnchor="end">+ {formatHorizon(horizon)}</SvgText>
        <SvgText x={WIDTH - LEFT} y={point(0, 0.9).y - 6} fill={c.textSecondary} fontSize={10} textAnchor="end">seuil 90 %</SvgText>
      </Svg>

      <View style={[styles.insight, { backgroundColor: c.surfaceMuted }]}>
        <Sparkles color={c.primary} size={18} />
        <Text style={[styles.insightText, { color: c.textSecondary }]}>
          {!active.length
            ? "Ajoute un cours étudié pour obtenir une estimation personnalisée."
            : atRisk
              ? `${atRisk} cours ${atRisk > 1 ? "passent" : "passe"} sous le seuil de 90 %. Une révision les renforce.`
              : "Tes cours actifs restent au-dessus du seuil cible de 90 %."}
        </Text>
      </View>
      <Text style={[styles.note, { color: c.textSecondary }]}>Estimation dynamique, pas une mesure médicale.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: "800", letterSpacing: -0.4 },
  insight: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 13 },
  insightText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  note: { fontSize: 11, lineHeight: 16 },
});
