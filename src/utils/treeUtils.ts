import type { WorkspaceNode } from "../types/copybara";

export const getAllFolderPaths = (nodes: WorkspaceNode[]): string[] => {
  return nodes.flatMap((node) => {
    if (node.type !== "folder") {
      return [];
    }

    return [
      node.path,
      ...getAllFolderPaths(node.children ?? []),
    ];
  });
};

export const getFolderAncestorPaths = (folderPath: string): string[] => {
  const parts = folderPath.split("/");

  return parts
    .slice(0, -1)
    .map((_, index) => parts.slice(0, index + 1).join("/"));
};