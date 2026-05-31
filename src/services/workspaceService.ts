import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

import type { WorkspaceNode } from "../types/copybara";
import { buildFilePath } from "../utils/pathUtils";

type WorkspaceData = {
  nodes: WorkspaceNode[];
  files: string[];
  contents: Record<string, string>;
};

export const loadWorkspaceData = async (
  folderPath: string
): Promise<WorkspaceData> => {
  const readFolderTree = async (
    currentFolderPath: string,
    relativePrefix = ""
  ): Promise<{ nodes: WorkspaceNode[]; files: string[] }> => {
    const entries = await readDir(currentFolderPath);

    const results = await Promise.all(
      entries.map(async (entry) => {
        const relativePath = relativePrefix
          ? `${relativePrefix}/${entry.name}`
          : entry.name;

        const fullPath = buildFilePath(folderPath, relativePath);

        if (entry.isDirectory) {
          const nested = await readFolderTree(fullPath, relativePath);

          if (nested.nodes.length === 0) {
            return null;
          }

          return {
            node: {
              type: "folder" as const,
              name: entry.name,
              path: relativePath,
              children: nested.nodes,
            },
            files: nested.files,
          };
        }

        if (entry.isFile && entry.name.toLowerCase().endsWith(".txt")) {
          return {
            node: {
              type: "file" as const,
              name: entry.name,
              path: relativePath,
            },
            files: [relativePath],
          };
        }

        return null;
      })
    );

    const validResults = results.filter((item) => item !== null) as {
      node: WorkspaceNode;
      files: string[];
    }[];

    const nodes = validResults
      .map((item) => item.node)
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });

    const files = validResults.flatMap((item) => item.files);

    return { nodes, files };
  };

  const { nodes, files } = await readFolderTree(folderPath);

  const contentsEntries = await Promise.all(
    files.map(async (filePath) => {
      const content = await readTextFile(buildFilePath(folderPath, filePath));
      return [filePath, content] as const;
    })
  );

  return {
    nodes,
    files,
    contents: Object.fromEntries(contentsEntries),
  };
};