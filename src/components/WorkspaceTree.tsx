import type { MouseEvent as ReactMouseEvent } from "react";

import {
  Box,
  ListItemButton,
  ListItemText,
} from "@mui/material";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DescriptionIcon from "@mui/icons-material/Description";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";

import type { WorkspaceNode } from "../types/copybara";
import { parseInstructions } from "../utils/instructionUtils";

type WorkspaceTreeProps = {
  nodes: WorkspaceNode[];
  selectedFileName: string | null;
  collapsedFolderPaths: Set<string>;
  workspaceContents: Record<string, string>;
  treeSearchText: string;
  onToggleFolder: (folderPath: string) => void;
  onSelectFile: (filePath: string) => void;
  onOpenContextMenu: (
    event: ReactMouseEvent,
    node: WorkspaceNode
  ) => void;
};

export default function WorkspaceTree({
  nodes,
  selectedFileName,
  collapsedFolderPaths,
  workspaceContents,
  treeSearchText,
  onToggleFolder,
  onSelectFile,
  onOpenContextMenu,
}: WorkspaceTreeProps) {
  const normalizedTreeSearchText = treeSearchText.trim().toLowerCase();
  const isTreeSearchActive = normalizedTreeSearchText.length > 0;

  const nodeMatchesSearch = (node: WorkspaceNode) => {
    return (
      node.name.toLowerCase().includes(normalizedTreeSearchText) ||
      node.path.toLowerCase().includes(normalizedTreeSearchText)
    );
  };

  const filterNodesBySearch = (items: WorkspaceNode[]): WorkspaceNode[] => {
    if (!isTreeSearchActive) {
      return items;
    }

    return items
      .map((node) => {
        if (node.type === "file") {
          return nodeMatchesSearch(node) ? node : null;
        }

        const filteredChildren = node.children
          ? filterNodesBySearch(node.children)
          : [];

        if (nodeMatchesSearch(node)) {
          return node;
        }

        if (filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }

        return null;
      })
      .filter((node): node is WorkspaceNode => node !== null);
  };

  const visibleNodes = filterNodesBySearch(nodes);

  const renderNodes = (items: WorkspaceNode[], level = 0) =>
    items.map((node) => {
      if (node.type === "folder") {
        const isCollapsed =
          !isTreeSearchActive && collapsedFolderPaths.has(node.path);

        return (
          <Box key={`folder-${node.path}`}>
            <ListItemButton
              onClick={() => onToggleFolder(node.path)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();

                onOpenContextMenu(event, node);
              }}
              sx={{ pl: 2 + level * 3 }}
            >
              {isCollapsed ? (
                <ChevronRightIcon
                  fontSize="small"
                  sx={{ mr: 0.75, color: "text.secondary" }}
                />
              ) : (
                <ExpandMoreIcon
                  fontSize="small"
                  sx={{ mr: 0.75, color: "text.secondary" }}
                />
              )}

              <FolderIcon sx={{ mr: 1.25, color: "primary.main" }} />

              <ListItemText primary={node.name} />
            </ListItemButton>

            {!isCollapsed &&
              node.children &&
              renderNodes(node.children, level + 1)}
          </Box>
        );
      }

      return (
        <ListItemButton
          key={`file-${node.path}`}
          data-copybara-file-path={node.path}
          selected={node.path === selectedFileName}
          onClick={() => onSelectFile(node.path)}
          onContextMenu={(event) => onOpenContextMenu(event, node)}
          sx={{ pl: 2 + level * 3 }}
        >
          <DescriptionIcon sx={{ mr: 1.25, fontSize: 19 }} />

          <ListItemText
            primary={node.name}
            secondary={`${parseInstructions(workspaceContents[node.path] ?? "").length
              } команд`}
          />
        </ListItemButton>
      );
    });

  return <>{renderNodes(visibleNodes)}</>;
}