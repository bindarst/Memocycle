import React from "react";
import { Text, View } from "react-native";
import Svg, { Line, Polygon, Text as SvgText } from "react-native-svg";
import { Card, Pill, usePalette } from "./components";

export type MasteryAxis = { label: string; value: number };

export function MasteryRadar({ axes }: { axes: MasteryAxis[] }) {
  const c = usePalette();
  const items = axes.slice(0, 6);
  if (items.length < 3) return null;
  const size = 260;
  const center = size / 2;
  const radius = 82;
  const point = (index: number, scale: number) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / items.length);
    return { x: center + Math.cos(angle) * radius * scale, y: center + Math.sin(angle) * radius * scale };
  };
  const polygon = (scale: number) => items.map((_, index) => {
    const p = point(index, scale);
    return `${p.x},${p.y}`;
  }).join(" ");
  const values = items.map((item, index) => {
    const p = point(index, Math.max(0.08, Math.min(1, item.value / 100)));
    return `${p.x},${p.y}`;
  }).join(" ");
  const average = Math.round(items.reduce((sum, item) => sum + item.value, 0) / items.length);

  return (
    <Card style={{ alignItems: "center", gap: 4 }}>
      <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: c.textPrimary, fontWeight: "700", fontSize: 16 }}>Radar de maîtrise</Text>
          <Text style={{ color: c.textSecondary, fontSize: 12 }}>Tes matières en un regard</Text>
        </View>
        <Pill tone={average >= 90 ? "success" : "warning"}>{average} %</Pill>
      </View>
      <Svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <Polygon key={scale} points={polygon(scale)} fill="none" stroke={c.chartGrid} strokeWidth={1} />
        ))}
        {items.map((_, index) => {
          const p = point(index, 1);
          return <Line key={index} x1={center} y1={center} x2={p.x} y2={p.y} stroke={c.chartGrid} strokeWidth={1} />;
        })}
        <Polygon points={values} fill={c.primary} fillOpacity={0.18} stroke={c.primary} strokeWidth={2.5} />
        {items.map((item, index) => {
          const p = point(index, 1.25);
          return <SvgText key={item.label} x={p.x} y={p.y} fill={c.textSecondary} fontSize={10} textAnchor="middle">{item.label.slice(0, 12)}</SvgText>;
        })}
      </Svg>
    </Card>
  );
}
