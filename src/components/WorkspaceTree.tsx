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
  onToggleFolder,
  onSelectFile,
  onOpenContextMenu,
}: WorkspaceTreeProps) {
  const renderNodes = (items: WorkspaceNode[], level = 0) =>
    items.map((node) => {
      if (node.type === "folder") {
        const isCollapsed = collapsedFolderPaths.has(node.path);

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
          selected={node.path === selectedFileName}
          onClick={() => onSelectFile(node.path)}
          onContextMenu={(event) => onOpenContextMenu(event, node)}
          sx={{ pl: 2 + level * 3 }}
        >
          <DescriptionIcon sx={{ mr: 1.25, fontSize: 19 }} />

          <ListItemText
            primary={node.name}
            secondary={`${
              parseInstructions(workspaceContents[node.path] ?? "").length
            } команд`}
          />
        </ListItemButton>
      );
    });

  return <>{renderNodes(nodes)}</>;
}