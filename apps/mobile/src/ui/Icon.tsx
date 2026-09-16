import React from "react";
import type { ColorValue } from "react-native";
import { HugeiconsIcon, type HugeiconsProps } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";

export type IconType = IconSvgElement;

export interface AppIconProps extends Omit<HugeiconsProps, "icon" | "color"> {
  icon: IconSvgElement;
  size?: number;
  color?: string | ColorValue;
  strokeWidth?: number;
}

export function AppIcon({
  icon,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.6,
  style,
  ...props
}: AppIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color as string}
      strokeWidth={strokeWidth}
      style={style}
      {...props}
    />
  );
}

