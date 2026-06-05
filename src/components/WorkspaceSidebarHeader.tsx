import { useEffect, useRef } from "react";

import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import RefreshIcon from "@mui/icons-material/Refresh";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import TerminalIcon from "@mui/icons-material/Terminal";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

type WorkspaceSidebarHeaderProps = {
  appVersion: string;
  workspacePath: string | null;
  availableUpdateVersion: string | null;
  treeSearchText: string;
  treeSearchVisible: boolean;
  onHideTreePanel: () => void;
  onCheckForUpdates: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onReloadWorkspaceDirectory: () => void;
  onTreeSearchTextChange: (value: string) => void;
  onToggleTreeSearchVisible: () => void;
};

export default function WorkspaceSidebarHeader({
  appVersion,
  workspacePath,
  availableUpdateVersion,
  treeSearchText,
  treeSearchVisible,
  onHideTreePanel,
  onCheckForUpdates,
  onCreateFile,
  onCreateFolder,
  onReloadWorkspaceDirectory,
  onTreeSearchTextChange,
  onToggleTreeSearchVisible,
}: WorkspaceSidebarHeaderProps) {
  const treeSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!treeSearchVisible) {
      return;
    }

    requestAnimationFrame(() => {
      treeSearchInputRef.current?.focus();
    });
  }, [treeSearchVisible]);

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        px: 2,
        py: 1.5,
        backgroundColor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(242, 140, 40, 0.14)",
              border: "1px solid",
              borderColor: "primary.main",
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <TerminalIcon sx={{ fontSize: 18 }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Copybara{appVersion ? ` v${appVersion}` : ""}
          </Typography>
        </Box>

        <IconButton
          size="small"
          title="Сховати дерево"
          onClick={onHideTreePanel}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          title="Перевірити оновлення"
          onClick={onCheckForUpdates}
        >
          <Badge
            color="warning"
            variant="dot"
            invisible={!availableUpdateVersion}
            overlap="circular"
          >
            <SystemUpdateAltIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          mt: 1.5,
          maxWidth: 230,
        }}
      >
        <Box
          sx={{
            display: "flex",
            width: 180,
            flexShrink: 0,
            border: "1px solid",
            borderColor: workspacePath ? "primary.main" : "action.disabled",
            borderRadius: 1.5,
            overflow: "hidden",
          }}
        >
          <Button
            size="small"
            color="primary"
            disabled={!workspacePath}
            startIcon={<AddIcon />}
            onClick={onCreateFile}
            sx={{
              flex: 1,
              minWidth: 0,
              borderRadius: 0,
              justifyContent: "center",
              px: 1,
            }}
          >
            Файл
          </Button>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              borderColor: workspacePath ? "primary.main" : "action.disabled",
            }}
          />

          <Button
            size="small"
            color="primary"
            disabled={!workspacePath}
            endIcon={<CreateNewFolderIcon />}
            onClick={onCreateFolder}
            sx={{
              flex: 1,
              minWidth: 0,
              borderRadius: 0,
              justifyContent: "center",
              px: 1,
            }}
          >
            Папка
          </Button>
        </Box>

        <IconButton
          size="small"
          color="primary"
          disabled={!workspacePath}
          onClick={onReloadWorkspaceDirectory}
          title="Перечитати директорію"
          sx={{
            border: "1px solid",
            borderColor: "primary.main",
            borderRadius: 1.5,
          }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          color={treeSearchVisible ? "primary" : "default"}
          onClick={onToggleTreeSearchVisible}
          disabled={!workspacePath}
          title={treeSearchVisible ? "Сховати пошук" : "Пошук у дереві"}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
      </Box>

      {treeSearchVisible && (
        <TextField
          size="small"
          fullWidth
          value={treeSearchText}
          onChange={(event) => onTreeSearchTextChange(event.target.value)}
          placeholder="Пошук у дереві..."
          disabled={!workspacePath}
          sx={{ mt: 1.25 }}
          inputRef={treeSearchInputRef}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  sx={{ mr: 0.75, color: "text.secondary" }}
                />
              ),
              endAdornment: treeSearchText ? (
                <IconButton
                  size="small"
                  onClick={() => onTreeSearchTextChange("")}
                  title="Очистити пошук"
                  sx={{ p: 0.25 }}
                >
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              ) : null,
            },
          }}
        />
      )}
    </Box>
  );
}