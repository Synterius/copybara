import type { ReplacementRule } from "../types/replacement";

export const primaryReplacementColor = "#f28c28";

const replacementColorPalette = [
  "#26a69a",
  "#42a5f5",
  "#ab47bc",
  "#ec407a",
  "#ff7043",
  "#7e57c2",
  "#66bb6a",
  "#29b6f6",
  "#ffa726",
  "#8d6e63",
];

export const createReplacementRule = (index: number): ReplacementRule => {
  const color =
    index === 0
      ? primaryReplacementColor
      : replacementColorPalette[
          Math.floor(Math.random() * replacementColorPalette.length)
        ];

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    from: "",
    to: "",
    color,
  };
};

export const getActiveReplacementRules = (
  replacementVisible: boolean,
  replacementRules: ReplacementRule[]
): ReplacementRule[] => {
  if (!replacementVisible) {
    return [];
  }

  return replacementRules.filter((rule) => rule.from.trim().length > 0);
};

export const applyReplacementRules = (
  text: string,
  activeRules: ReplacementRule[]
): string => {
  if (activeRules.length === 0) {
    return text;
  }

  return activeRules.reduce((currentText, rule) => {
    return currentText.split(rule.from).join(rule.to);
  }, text);
};