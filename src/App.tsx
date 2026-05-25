import { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Chip,
  CssBaseline,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

// Іконки
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import DescriptionIcon from "@mui/icons-material/Description";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FindReplaceIcon from "@mui/icons-material/FindReplace";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";

import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

const drawerWidth = 280;

type Instruction = {
  description: string;
  command: string;
};

type WorkspaceNode = {
  type: "folder" | "file";
  name: string;
  path: string;
  children?: WorkspaceNode[];
};

const parseInstructions = (content: string): Instruction[] => {
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

function App() {
  const [appVersion, setAppVersion] = useState("");
  const [darkMode, setDarkMode] = useState(true);

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string | null>(
    localStorage.getItem("copybara.workspacePath")
  );
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode[]>([]);
  const [workspaceContents, setWorkspaceContents] = useState<Record<string, string>>({});

  const [searchText, setSearchText] = useState("");
  const [replaceFrom, setReplaceFrom] = useState("");
  const [replaceTo, setReplaceTo] = useState("");
  const [replacementVisible, setReplacementVisible] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [lastCopiedIndex, setLastCopiedIndex] = useState<number | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newCommand, setNewCommand] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editCommand, setEditCommand] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const [availableUpdateVersion, setAvailableUpdateVersion] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateDialogTitle, setUpdateDialogTitle] = useState("");
  const [updateDialogMessage, setUpdateDialogMessage] = useState("");
  const [updateToInstall, setUpdateToInstall] = useState<Awaited<ReturnType<typeof check>> | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);

  const [createFileDialogOpen, setCreateFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileParentPath, setNewFileParentPath] = useState<string | null>(null);

  const instructions = selectedFileName
    ? parseInstructions(workspaceContents[selectedFileName] ?? "")
    : [];

  const filteredInstructions = instructions
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const query = searchText.toLowerCase();

      return (
        item.description.toLowerCase().includes(query) ||
        item.command.toLowerCase().includes(query)
      );
    });

  useEffect(() => {
    const loadAppVersion = async () => {
      const version = await getVersion();

      setAppVersion(version);
      await getCurrentWindow().setTitle(`Copybara v${version}`);
    };

    loadAppVersion();
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          primary: {
            main: "#f28c28",
          },
          background: {
            default: darkMode ? "#1f1f1f" : "#f5f5f5",
            paper: darkMode ? "#2b2b2b" : "#ffffff",
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              "*": {
                scrollbarWidth: "thin",
                scrollbarColor: darkMode
                  ? "#5a5a5a #1f1f1f"
                  : "#bdbdbd #f5f5f5",
              },
              "*::-webkit-scrollbar": {
                width: "10px",
                height: "10px",
              },
              "*::-webkit-scrollbar-track": {
                background: darkMode ? "#1f1f1f" : "#f5f5f5",
              },
              "*::-webkit-scrollbar-thumb": {
                backgroundColor: darkMode ? "#5a5a5a" : "#bdbdbd",
                borderRadius: "10px",
                border: `2px solid ${darkMode ? "#1f1f1f" : "#f5f5f5"}`,
              },
              "*::-webkit-scrollbar-thumb:hover": {
                backgroundColor: darkMode ? "#777777" : "#9e9e9e",
              },
            },
          },
        },
      }),
    [darkMode]
  );

  useEffect(() => {
    if (!workspacePath) {
      return;
    }

    loadWorkspaceFolder(workspacePath).catch((error) => {
      console.error("Failed to load saved workspace:", error);
      localStorage.removeItem("copybara.workspacePath");
      setWorkspacePath(null);
      setWorkspaceFiles([]);
      setWorkspaceContents({});
      setSelectedFileName(null);
    });
  }, []);

  useEffect(() => {
    const checkUpdatesOnStartup = async () => {
      try {
        const update = await check();

        if (update) {
          setAvailableUpdateVersion(update.version);
        } else {
          setAvailableUpdateVersion(null);
        }
      } catch (error) {
        console.warn("Silent update check failed:", error);
      }
    };

    checkUpdatesOnStartup();
  }, []);

  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      const isCtrl = event.ctrlKey || event.metaKey;

      if (!isCtrl) {
        return;
      }

      const isPlus =
        event.key === "+" ||
        event.key === "=" ||
        event.code === "Equal" ||
        event.code === "NumpadAdd";

      if (event.key === "Enter") {
        event.preventDefault();

        if (addDialogOpen) {
          addCommandToCurrentFile();
        }

        return;
      }

      if (isPlus && event.shiftKey) {
        event.preventDefault();

        if (workspacePath) {
          openCreateFileDialog();
        }

        return;
      }

      if (isPlus) {
        event.preventDefault();

        if (workspacePath && selectedFileName) {
          setAddDialogOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);

    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts);
    };
  }, [
    addDialogOpen,
    workspacePath,
    selectedFileName,
    newCommand,
    newDescription,
    newFileName,
    newFileParentPath,
  ]);

  // --- Функції --- //
  // Функції для роботи з діалогом видалення інструкції
  const openDeleteDialog = (index: number) => {
    setDeleteIndex(index);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteIndex(null);
  };

  // Функція для перечитування поточного файлу (наприклад, після зовнішніх змін)
  const reloadCurrentFile = async () => {
    if (!workspacePath || !selectedFileName) {
      return;
    }

    const content = await readTextFile(buildFilePath(workspacePath, selectedFileName));

    setWorkspaceContents((current) => ({
      ...current,
      [selectedFileName]: content,
    }));

    setSearchText("");
    cancelEditingInstruction();
    showSnackbar("Файл перечитано");
  };

  // Функція для побудови повного шляху до файлу в робочій папці
  const buildFilePath = (folderPath: string, relativePath: string) => {
    const separator =
      folderPath.includes("\\") && !folderPath.includes("/") ? "\\" : "/";

    const cleanFolderPath = folderPath.replace(/[\\/]+$/g, "");
    const cleanRelativePath = relativePath
      .replace(/^[\\/]+/g, "")
      .replace(/[\\/]/g, separator);

    return `${cleanFolderPath}${separator}${cleanRelativePath}`;
  };

  const loadWorkspaceFolder = async (folderPath: string) => {
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

    setWorkspaceTree(nodes);
    setWorkspaceFiles(files);
    setWorkspaceContents(Object.fromEntries(contentsEntries));

    const firstFile = files[0];

    if (firstFile) {
      setSelectedFileName((current) =>
        current && files.includes(current) ? current : firstFile
      );
    } else {
      setSelectedFileName("");
    }

    setSearchText("");
    cancelEditingInstruction();
  };

  const applyReplacement = (text: string) => {
    if (!replaceFrom) {
      return text;
    }

    return text.split(replaceFrom).join(replaceTo);
  };

  const renderCommandWithReplacementHighlight = (text: string) => {
    if (!replaceFrom) {
      return text;
    }

    const parts = text.split(replaceFrom);

    return parts.map((part, index) => (
      <span key={index}>
        {part}

        {index < parts.length - 1 && (
          <Box
            component="span"
            sx={{
              px: 0.4,
              borderRadius: 0.75,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontWeight: 700,
            }}
          >
            {replaceTo || replaceFrom}
          </Box>
        )}
      </span>
    ));
  };

  // Функція для відкриття діалогу вибору папки та завантаження вибраної папки як робочої
  const openWorkspaceFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      recursive: true,
      title: "Open Copybara folder",
    });

    if (typeof selected !== "string") {
      return;
    }

    localStorage.setItem("copybara.workspacePath", selected);
    setWorkspacePath(selected);

    await loadWorkspaceFolder(selected);
    setSearchText("");
  };

  const cancelEditingInstruction = () => {
    setEditingIndex(null);
    setEditDescription("");
    setEditCommand("");
  };

  const saveEditingInstruction = async () => {
    if (!workspacePath || !selectedFileName || editingIndex === null) {
      return;
    }

    const description = editDescription.trim();
    const command = editCommand.replace(/\s+$/g, "");

    if (!command) {
      return;
    }

    const updatedInstructions = instructions.map((item, index) =>
      index === editingIndex
        ? {
          description,
          command,
        }
        : item
    );

    const updatedContent =
      updatedInstructions
        .map((item) =>
          item.description.trim()
            ? `// ${item.description.trim()}\n${item.command}`
            : item.command
        )
        .join("\n\n") + "\n";

    await writeTextFile(
      buildFilePath(workspacePath, selectedFileName),
      updatedContent
    );

    setWorkspaceContents((current) => ({
      ...current,
      [selectedFileName]: updatedContent,
    }));

    cancelEditingInstruction();
    setSearchText("");
    showSnackbar("Команду збережено");
  };

  const startEditingInstruction = (index: number, item: Instruction) => {
    setEditingIndex(index);
    setEditDescription(item.description);
    setEditCommand(item.command);
  };

  const addCommandToCurrentFile = async () => {
    if (!workspacePath || !selectedFileName) return;

    const command = newCommand.trimEnd();
    const description = newDescription.trim();

    if (!command.trim()) return;

    const currentContent = workspaceContents[selectedFileName] ?? "";

    const newBlock = description
      ? `// ${description}\n${command}`
      : command;

    const nextContent = currentContent.trimEnd()
      ? `${currentContent.trimEnd()}\n\n${newBlock}\n`
      : `${newBlock}\n`;

    const selectedFilePath = buildFilePath(workspacePath, selectedFileName);

    await writeTextFile(selectedFilePath, nextContent);

    setWorkspaceContents((prev) => ({
      ...prev,
      [selectedFileName]: nextContent,
    }));

    setAddDialogOpen(false);
    setNewDescription("");
    setNewCommand("");
    showSnackbar("Команду додано");
  };

  const copyCommand = async (command: string, index: number) => {
    await navigator.clipboard.writeText(command);

    setLastCopiedIndex(index);
    showSnackbar("Команду скопійовано");
  };

  const deleteInstructionFromCurrentFile = async () => {
    if (!selectedFileName || !workspacePath || deleteIndex === null) return;

    const currentContent = workspaceContents[selectedFileName] ?? "";
    const instructions = parseInstructions(currentContent);

    const nextInstructions = instructions.filter((_, index) => index !== deleteIndex);

    const nextContent =
      nextInstructions
        .map((item) => {
          const command = item.command.trimEnd();
          const description = item.description.trim();

          return description ? `// ${description}\n${command}` : command;
        })
        .join("\n\n") + (nextInstructions.length > 0 ? "\n" : "");

    const selectedFilePath = buildFilePath(workspacePath, selectedFileName);

    await writeTextFile(selectedFilePath, nextContent);

    setWorkspaceContents((prev) => ({
      ...prev,
      [selectedFileName]: nextContent,
    }));

    closeDeleteDialog();
    showSnackbar("Команду видалено");
  };

  const checkForUpdates = async () => {
    try {
      const update = await check();

      if (!update) {
        setUpdateToInstall(null);
        setUpdateDialogTitle("Оновлень немає");
        setUpdateDialogMessage("У тебе вже встановлена найновіша версія Copybara.");
        setUpdateDialogOpen(true);
        return;
      }

      setAvailableUpdateVersion(update.version);
      setUpdateToInstall(update);
      setUpdateDialogTitle("Доступне оновлення");
      setUpdateDialogMessage(`Доступна нова версія Copybara v${update.version}. Бажаєш оновити зараз?`);
      setUpdateDialogOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      setUpdateToInstall(null);
      setUpdateDialogTitle("Помилка оновлення");
      setUpdateDialogMessage(message);
      setUpdateDialogOpen(true);
    }
  };

  const installSelectedUpdate = async () => {
    if (!updateToInstall) {
      setUpdateDialogOpen(false);
      return;
    }

    try {
      setIsInstallingUpdate(true);
      setUpdateDialogMessage("Оновлення завантажується та встановлюється...");

      await updateToInstall.downloadAndInstall();

      setUpdateDialogMessage("Оновлення встановлено. Перезапуск Copybara...");
      await relaunch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      setUpdateDialogTitle("Помилка встановлення");
      setUpdateDialogMessage(message);
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  const renderWorkspaceNodes = (nodes: WorkspaceNode[], level = 0) =>
    nodes.map((node) => {
      if (node.type === "folder") {
        return (
          <Box key={`folder-${node.path}`}>
            <ListItemButton sx={{ pl: 2 + level * 3 }}>
              <FolderIcon sx={{ mr: 1.5, color: "primary.main" }} />

              <ListItemText primary={node.name} />
            </ListItemButton>

            {node.children && renderWorkspaceNodes(node.children, level + 1)}
          </Box>
        );
      }

      return (
        <ListItemButton
          key={`file-${node.path}`}
          selected={node.path === selectedFileName}
          onClick={() => {
            setSelectedFileName(node.path);
            setSearchText("");
          }}
          sx={{ pl: 2 + level * 3 }}
        >
          <DescriptionIcon sx={{ mr: 1.5 }} />

          <ListItemText
            primary={node.name}
            secondary={`${parseInstructions(
              workspaceContents[node.path] ?? ""
            ).length} команд`}
          />
        </ListItemButton>
      );
    });


  const openCreateFileDialog = (parentPath?: string) => {
    setNewFileParentPath(parentPath ?? workspacePath ?? null);
    setNewFileName("");
    setCreateFileDialogOpen(true);
  };

  const handleCreateFile = async () => {
    if (!newFileParentPath) {
      showSnackbar("Спочатку виберіть папку для роботи");
      return;
    }

    const trimmedName = newFileName.trim();

    if (!trimmedName) {
      showSnackbar("Вкажіть назву файлу");
      return;
    }

    const safeFileName = trimmedName.endsWith(".txt")
      ? trimmedName
      : `${trimmedName}.txt`;

    const fullPath = buildFilePath(newFileParentPath, safeFileName);

    try {
      await writeTextFile(fullPath, "");

      setCreateFileDialogOpen(false);
      setNewFileName("");

      await loadWorkspaceFolder(newFileParentPath);

      setSelectedFileName(safeFileName);
      setSearchText("");

      showSnackbar(`Файл "${safeFileName}" створено`);
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося створити файл");
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };
  // --- --- //

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box sx={{ display: "flex", height: "100vh" }}>
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
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
              <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
                🦫 Copybara{appVersion ? ` v${appVersion}` : ""}
              </Typography>

              <IconButton
                size="small"
                title="Перевірити оновлення"
                onClick={checkForUpdates}
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

            <Button
              fullWidth
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              disabled={!workspacePath}
              onClick={() => openCreateFileDialog()}
              sx={{
                mt: 1.5,
                justifyContent: "flex-start",
                textTransform: "none",
              }}
            >
              Новий файл
            </Button>
          </Box>

          <List>
            {workspaceFiles.length > 0 ? (
              renderWorkspaceNodes(workspaceTree)
            ) : (
              <Box sx={{ px: 2, py: 3 }}>
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  Виберіть папку для роботи
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Тут зʼявляться .txt файли з вибраної папки.
                </Typography>
              </Box>
            )}
          </List>
        </Drawer>

        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
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
                  fullWidth
                  placeholder="Пошук інструкцій..."
                  disabled={!selectedFileName}
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
                {searchText && (
                  <IconButton size="small" onClick={() => setSearchText("")}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Button
                variant="outlined"
                color="primary"
                startIcon={<FolderOpenIcon />}
                onClick={openWorkspaceFolder}
              >
                Відкрити папку
              </Button>

              <IconButton onClick={() => setDarkMode((v) => !v)}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Toolbar>
          </AppBar>

          <Box sx={{ px: 3, pb: 3, overflow: "auto" }}>
            {!workspacePath ? (
              <Card sx={{ mt: 3 }}>
                <CardContent sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    Виберіть папку для роботи
                  </Typography>

                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Copybara покаже тут .txt файли з вибраної папки.
                  </Typography>

                  <Button
                    variant="contained"
                    startIcon={<FolderOpenIcon />}
                    onClick={openWorkspaceFolder}
                  >
                    Відкрити папку
                  </Button>
                </CardContent>
              </Card>
            ) : workspaceFiles.length === 0 ? (
              <Card sx={{ mt: 3 }}>
                <CardContent sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    У вибраній папці немає .txt файлів
                  </Typography>

                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Виберіть іншу папку або додайте .txt файл у поточну.
                  </Typography>

                  <Button
                    variant="outlined"
                    startIcon={<FolderOpenIcon />}
                    onClick={openWorkspaceFolder}
                  >
                    Вибрати іншу папку
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Box
                  sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    mb: 2,
                    py: 1.5,
                    backgroundColor: "background.default",
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {selectedFileName}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {workspacePath ?? "Папку ще не вибрано"}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Команд: {filteredInstructions.length} / {instructions.length}
                      </Typography>
                    </Box>

                    <IconButton
                      color="primary"
                      onClick={() => setAddDialogOpen(true)}
                      title="Додати команду"
                      disabled={!workspacePath || !selectedFileName}
                    >
                      <AddIcon />
                    </IconButton>

                    <IconButton
                      color="primary"
                      onClick={reloadCurrentFile}
                      title="Перечитати файл"
                      disabled={!workspacePath || !selectedFileName}
                    >
                      <RefreshIcon />
                    </IconButton>

                    <IconButton
                      color={replacementVisible ? "primary" : "default"}
                      onClick={() => setReplacementVisible((value) => !value)}
                      title="Заміна тексту"
                      disabled={!workspacePath || !selectedFileName}
                    >
                      <FindReplaceIcon />
                    </IconButton>

                  </Box>

                  {replacementVisible && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        width: "100%",
                        pt: 1,
                      }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        label="Що замінити"
                        placeholder="Наприклад: XXX"
                        value={replaceFrom}
                        onChange={(event) => setReplaceFrom(event.target.value)}
                      />

                      <TextField
                        fullWidth
                        size="small"
                        label="На що замінити"
                        placeholder="Наприклад: signal-bridge"
                        value={replaceTo}
                        onChange={(event) => setReplaceTo(event.target.value)}
                      />

                      <IconButton
                        onClick={() => {
                          setReplaceFrom("");
                          setReplaceTo("");
                        }}
                        title="Очистити заміну"
                        disabled={!replaceFrom && !replaceTo}
                      >
                        <ClearIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                {filteredInstructions.length === 0 && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography color="text.secondary">
                        {searchText.trim()
                          ? "Нічого не знайдено за поточним пошуком."
                          : "У цьому файлі ще немає команд. Натисніть +, щоб додати першу команду."}
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {filteredInstructions.map(({ item, index }) => {
                  const hasReplacementMatch =
                    Boolean(replaceFrom) && item.command.includes(replaceFrom);

                  return (
                    <Card
                      key={index}
                      sx={{
                        mb: 2,
                        border: "2px solid",
                        borderColor: hasReplacementMatch ? "primary.main" : "transparent",
                        boxShadow: hasReplacementMatch ? 6 : undefined,
                      }}
                    >
                      <CardContent>
                        {(item.description || editingIndex === index) && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                            {editingIndex === index ? (
                              <TextField
                                fullWidth
                                size="small"
                                label="Пояснення"
                                placeholder="Можна залишити порожнім"
                                value={editDescription}
                                onChange={(event) => setEditDescription(event.target.value)}
                              />
                            ) : (
                              <Typography
                                sx={{ color: "text.secondary", flexGrow: 1, cursor: "text" }}
                                onDoubleClick={() => startEditingInstruction(index, item)}
                              >
                                // {item.description}
                              </Typography>
                            )}

                            {replaceFrom && item.command.includes(replaceFrom) && (
                              <Chip
                                size="small"
                                color="primary"
                                variant="outlined"
                                label={`Містить ${replaceFrom}`}
                              />
                            )}
                          </Box>
                        )}

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                            bgcolor:
                              lastCopiedIndex === index
                                ? "rgba(242, 140, 40, 0.12)"
                                : "background.default",
                            p: 1.5,
                            borderRadius: 2,
                            fontFamily: "Consolas, monospace",
                            border: "1px solid",
                            borderColor:
                              lastCopiedIndex === index
                                ? "primary.main"
                                : "transparent",
                            transition: "background-color 0.2s ease, border-color 0.2s ease",
                          }}
                        >
                          {editingIndex === index ? (
                            <TextField
                              fullWidth
                              multiline
                              minRows={4}
                              label="Текст для копіювання"
                              value={editCommand}
                              onChange={(event) => setEditCommand(event.target.value)}
                              sx={{
                                "& textarea": {
                                  fontFamily: "Consolas, monospace",
                                  whiteSpace: "pre",
                                },
                              }}
                            />
                          ) : (
                            <Typography
                              component="pre"
                              onDoubleClick={() => startEditingInstruction(index, item)}
                              sx={{
                                flexGrow: 1,
                                m: 0,
                                fontFamily: "Consolas, monospace",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                cursor: "text",
                              }}
                            >
                              {renderCommandWithReplacementHighlight(item.command)}
                            </Typography>
                          )}

                          <IconButton
                            color="primary"
                            onClick={() => copyCommand(applyReplacement(item.command), index)}
                          >
                            <ContentCopyIcon />
                          </IconButton>

                          <IconButton
                            color="error"
                            onClick={() => openDeleteDialog(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>

                        {editingIndex === index && (
                          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
                            <Button
                              variant="outlined"
                              startIcon={<CloseIcon />}
                              onClick={cancelEditingInstruction}
                            >
                              Скасувати
                            </Button>

                            <Button
                              variant="contained"
                              startIcon={<SaveIcon />}
                              disabled={!editCommand.trim()}
                              onClick={saveEditingInstruction}
                            >
                              Зберегти
                            </Button>
                          </Box>
                        )}

                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={createFileDialogOpen}
        onClose={() => setCreateFileDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Створити новий файл</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Назва файлу"
            placeholder="Наприклад: linux.txt"
            value={newFileName}
            onChange={(event) => setNewFileName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && newFileName.trim()) {
                handleCreateFile();
              }
            }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Файл буде створено у вибраній папці. Розширення .txt можна не писати.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateFileDialogOpen(false)}>
            Скасувати
          </Button>

          <Button
            variant="contained"
            disabled={!newFileName.trim()}
            onClick={handleCreateFile}
          >
            Створити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Додати команду</DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Пояснення"
            placeholder="Наприклад: Перезапуск сервісу"
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            fullWidth
          />

          <TextField
            label="Текст для копіювання"
            placeholder="Команда або багаторядковий блок"
            value={newCommand}
            onChange={(event) => setNewCommand(event.target.value)}
            fullWidth
            multiline
            minRows={6}
            sx={{
              "& textarea": {
                fontFamily: "Consolas, monospace",
                whiteSpace: "pre",
              },
            }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>
            Скасувати
          </Button>

          <Button
            variant="contained"
            disabled={!selectedFileName || !newCommand.trim()}
            onClick={addCommandToCurrentFile}
          >
            Додати
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Видалити команду?</DialogTitle>

        <DialogContent>
          <Typography>
            Цю команду буде видалено з поточного .txt файлу.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDeleteDialog}>
            Скасувати
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={deleteInstructionFromCurrentFile}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={updateDialogOpen}
        onClose={isInstallingUpdate ? undefined : () => setUpdateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{updateDialogTitle}</DialogTitle>

        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-line" }}>
            {updateDialogMessage}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setUpdateDialogOpen(false)}
            disabled={isInstallingUpdate}
          >
            {updateToInstall ? "Пізніше" : "Закрити"}
          </Button>

          {updateToInstall && (
            <Button
              variant="contained"
              onClick={installSelectedUpdate}
              disabled={isInstallingUpdate}
            >
              {isInstallingUpdate ? "Встановлення..." : "Оновити"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={1500}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        sx={{
          "& .MuiSnackbarContent-root": {
            bgcolor: darkMode ? "#2b2b2b" : "#ffffff",
            color: darkMode ? "#ffffff" : "#1f1f1f",
            border: "1px solid",
            borderColor: "primary.main",
            boxShadow: 6,
          },
        }}
      />
    </ThemeProvider>
  );
}

export default App;