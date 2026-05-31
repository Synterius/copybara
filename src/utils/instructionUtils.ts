import type { Instruction } from "../types/copybara";

export const parseInstructions = (content: string): Instruction[] => {
  const blocks = content
    .split(/\r?\n\s*\r?\n/g)
    .map((block) => block.trimEnd())
    .filter((block) => block.trim().length > 0);

  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);

    const firstNonEmptyLineIndex = lines.findIndex(
      (line) => line.trim().length > 0
    );

    if (firstNonEmptyLineIndex === -1) {
      return {
        description: "",
        command: "",
      };
    }

    const firstLine = lines[firstNonEmptyLineIndex].trim();

    if (firstLine.startsWith("//")) {
      const description = firstLine.replace(/^\/\/\s?/, "");

      const command = lines
        .slice(firstNonEmptyLineIndex + 1)
        .join("\n")
        .trimEnd();

      return {
        description,
        command,
      };
    }

    return {
      description: "",
      command: block.trimEnd(),
    };
  });
};

export const serializeInstructions = (items: Instruction[]) =>
  items
    .map((item) => {
      const command = item.command.trimEnd();
      const description = item.description.trim();

      return description ? `// ${description}\n${command}` : command;
    })
    .join("\n\n") + (items.length > 0 ? "\n" : "");