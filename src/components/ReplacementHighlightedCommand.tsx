import { Box } from "@mui/material";

import type { ReplacementRule } from "../types/replacement";

type ReplacementHighlightedCommandProps = {
  text: string;
  activeRules: ReplacementRule[];
};

export default function ReplacementHighlightedCommand({
  text,
  activeRules,
}: ReplacementHighlightedCommandProps) {
  if (activeRules.length === 0) {
    return <>{text}</>;
  }

  const result: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let nextMatch:
      | {
          index: number;
          rule: ReplacementRule;
        }
      | null = null;

    for (const rule of activeRules) {
      const matchIndex = text.indexOf(rule.from, cursor);

      if (
        matchIndex !== -1 &&
        (!nextMatch || matchIndex < nextMatch.index)
      ) {
        nextMatch = {
          index: matchIndex,
          rule,
        };
      }
    }

    if (!nextMatch) {
      result.push(text.slice(cursor));
      break;
    }

    if (nextMatch.index > cursor) {
      result.push(text.slice(cursor, nextMatch.index));
    }

    result.push(
      <Box
        key={`${nextMatch.rule.id}-${nextMatch.index}-${result.length}`}
        component="span"
        sx={{
          px: 0.4,
          borderRadius: 0.75,
          bgcolor: nextMatch.rule.color,
          color: "#111111",
          fontWeight: 700,
        }}
      >
        {nextMatch.rule.to || nextMatch.rule.from}
      </Box>
    );

    cursor = nextMatch.index + nextMatch.rule.from.length;
  }

  return <>{result}</>;
}