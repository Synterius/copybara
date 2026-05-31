import type { RefObject } from "react";

import {
  AppBar,
  Box,
  Button,
  IconButton,
  InputBase,
  Toolbar,
} from "@mui/material";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import PushPinIcon from "@mui/icons-material/PushPin";

type TopBarProps = {
  darkMode: boolean;
  alwaysOnTop: boolean;
  selectedFileName: string | null;
  searchText: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchTextChange: (value: string) => void;
  onOpenWorkspaceFolder: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleDarkMode: () => void;
};

export default function TopBar({
  darkMode,
  alwaysOnTop,
  selectedFileName,
  searchText,
  searchInputRef,
  onSearchTextChange,
  onOpenWorkspaceFolder,
  onToggleAlwaysOnTop,
  onToggleDarkMode,
}: TopBarProps) {
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar sx={{ gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 0.75,
            flexGrow: 1,
            bgcolor: "background.paper",
            borderRadius: 2,
          }}
        >
          <SearchIcon sx={{ mr: 1, opacity: 0.7 }} />

          <InputBase
            inputRef={searchInputRef}
            fullWidth
            placeholder="Пошук інструкцій..."
            disabled={!selectedFileName}
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
          />

          {searchText && (
            <IconButton size="small" onClick={() => onSearchTextChange("")}>
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Button
          variant="outlined"
          color="primary"
          startIcon={<FolderOpenIcon />}
          onClick={onOpenWorkspaceFolder}
        >
          Відкрити папку
        </Button>

        <IconButton
          color={alwaysOnTop ? "primary" : "default"}
          onClick={onToggleAlwaysOnTop}
          title={
            alwaysOnTop
              ? "Вікно закріплено поверх інших"
              : "Закріпити вікно поверх інших"
          }
        >
          <PushPinIcon />
        </IconButton>

        <IconButton onClick={onToggleDarkMode}>
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}