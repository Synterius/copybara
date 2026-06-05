import type { Instruction } from "../types/copybara";

export const parseInstructions = (content: string): Instruction[] => {
  const lines = content.split(/\r?\n/);

  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let insideTemplate = false;
  let templateDelimiter: "---" | "===" | null = null;

  const flushBlock = () => {
    const block = currentBlock.join("\n").trimEnd();

    if (block.trim().length > 0) {
      blocks.push(block);
    }

    currentBlock = [];
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    const isTemplateDelimiter =
      trimmedLine === "---" || trimmedLine === "===";

    if (insideTemplate) {
      currentBlock.push(line);

      if (trimmedLine === templateDelimiter) {
        insideTemplate = false;
        templateDelimiter = null;
      }

      continue;
    }

    if (isTemplateDelimiter) {
      insideTemplate = true;
      templateDelimiter = trimmedLine as "---" | "===";
      currentBlock.push(line);
      continue;
    }

    if (trimmedLine.length === 0) {
      flushBlock();
      continue;
    }

    currentBlock.push(line);
  }

  flushBlock();

  return blocks.map((block) => {
    const blockLines = block.split(/\r?\n/);

    const firstNonEmptyLineIndex = blockLines.findIndex(
      (line) => line.trim().length > 0
    );

    if (firstNonEmptyLineIndex === -1) {
      return {
        description: "",
        command: "",
      };
    }

    const firstLine = blockLines[firstNonEmptyLineIndex].trim();

    if (firstLine.startsWith("//")) {
      const description = firstLine.replace(/^\/\/\s?/, "");

      let commandLines = blockLines.slice(firstNonEmptyLineIndex + 1);

      commandLines = unwrapTemplate(commandLines);

      return {
        description,
        command: commandLines.join("\n").trimEnd(),
      };
    }

    return {
      description: "",
      command: unwrapTemplate(blockLines).join("\n").trimEnd(),
    };
  });
};

const unwrapTemplate = (lines: string[]): string[] => {
  const firstNonEmptyLineIndex = lines.findIndex(
    (line) => line.trim().length > 0
  );

  if (firstNonEmptyLineIndex === -1) {
    return lines;
  }

  const firstLine = lines[firstNonEmptyLineIndex].trim();

  if (firstLine !== "---" && firstLine !== "===") {
    return lines;
  }

  const lastDelimiterIndex = [...lines]
    .reverse()
    .findIndex((line) => line.trim() === firstLine);

  if (lastDelimiterIndex === -1) {
    return lines;
  }

  const realLastDelimiterIndex = lines.length - 1 - lastDelimiterIndex;

  if (realLastDelimiterIndex === firstNonEmptyLineIndex) {
    return lines;
  }

  return lines.slice(firstNonEmptyLineIndex + 1, realLastDelimiterIndex);
};

const TEMPLATE_DELIMITER = "---";

const hasEmptyLinesInside = (text: string) => {
  return /\r?\n\s*\r?\n/.test(text);
};

const wrapCommandForStorage = (command: string) => {
  const normalizedCommand = command.trimEnd();

  if (!hasEmptyLinesInside(normalizedCommand)) {
    return normalizedCommand;
  }

  return `${TEMPLATE_DELIMITER}\n${normalizedCommand}\n${TEMPLATE_DELIMITER}`;
};

export const serializeInstructions = (items: Instruction[]) =>
  items
    .map((item) => {
      const command = wrapCommandForStorage(item.command);
      const description = item.description.trim();

      return description ? `// ${description}\n${command}` : command;
    })
    .join("\n\n") + (items.length > 0 ? "\n" : "");