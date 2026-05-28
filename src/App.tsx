import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  Divider,
  Menu,
  MenuItem,
} from "@mui/material";

// Іконки
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import DescriptionIcon from "@mui/icons-material/Description";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FindReplaceIcon from "@mui/icons-material/FindReplace";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import PushPinIcon from "@mui/icons-material/PushPin";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, readDir, readTextFile, writeTextFile, remove, rename } from "@tauri-apps/plugin-fs";

import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

const defaultDrawerWidth = 280;
const minDrawerWidth = 248;
const hiddenDrawerThreshold = 248;

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

type TreeContextMenu = {
  mouseX: number;
  mouseY: number;
  node: WorkspaceNode;
} | null;

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
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode[]>([]);
  const [workspaceContents, setWorkspaceContents] = useState<Record<string, string>>({});
  const [treeContextMenu, setTreeContextMenu] = useState<TreeContextMenu>(null);
  const [treePanelWidth, setTreePanelWidth] = useState(() => {
    const savedWidth = Number(localStorage.getItem("copybara.treePanelWidth"));

    return Number.isFinite(savedWidth) && savedWidth > 0
      ? savedWidth
      : defaultDrawerWidth;
  });
  const [collapsedFolderPaths, setCollapsedFolderPaths] = useState<Set<string>>(
    () => {
      try {
        const saved = localStorage.getItem("copybara.collapsedFolderPaths");

        if (!saved) {
          return new Set();
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
          return new Set();
        }

        return new Set(parsed.filter((item) => typeof item === "string"));
      } catch {
        return new Set();
      }
    }
  );
  const [treePanelHidden, setTreePanelHidden] = useState(false);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const resizingTreePanelRef = useRef(false);
  const [isResizingTreePanel, setIsResizingTreePanel] = useState(false);
  const [draggedInstructionIndex, setDraggedInstructionIndex] = useState<number | null>(null);
  const [dragOverInstructionIndex, setDragOverInstructionIndex] = useState<number | null>(null);

  const [searchText, setSearchText] = useState("");
  const [replaceFrom, setReplaceFrom] = useState("");
  const [replaceTo, setReplaceTo] = useState("");
  const [replacementVisible, setReplacementVisible] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [lastCopiedIndex, setLastCopiedIndex] = useState<number | null>(null);
  const [minimizeAfterCopy, setMinimizeAfterCopy] = useState(() => {
    return localStorage.getItem("copybara.minimizeAfterCopy") === "true";
  });
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => {
    return localStorage.getItem("copybara.alwaysOnTop") === "true";
  });

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newCommand, setNewCommand] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editCommand, setEditCommand] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteFileDialogOpen, setDeleteFileDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<WorkspaceNode | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<WorkspaceNode | null>(null);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [nodeToRename, setNodeToRename] = useState<WorkspaceNode | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [availableUpdateVersion, setAvailableUpdateVersion] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateDialogTitle, setUpdateDialogTitle] = useState("");
  const [updateDialogMessage, setUpdateDialogMessage] = useState("");
  const [updateToInstall, setUpdateToInstall] = useState<Awaited<ReturnType<typeof check>> | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);

  const [createFileDialogOpen, setCreateFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileParentPath, setNewFileParentPath] = useState<string | null>(null);
  const [newFileParentRelativePath, setNewFileParentRelativePath] = useState("");

  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentPath, setNewFolderParentPath] = useState<string | null>(null);
  const [newFolderParentRelativePath, setNewFolderParentRelativePath] = useState("");

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

  const maxTreePanelWidth = Math.floor(windowWidth * 0.6);
  const visibleTreePanelWidth = Math.min(
    Math.max(treePanelWidth, minDrawerWidth),
    maxTreePanelWidth
  );

  useEffect(() => {
    const loadAppVersion = async () => {
      const version = await getVersion();

      setAppVersion(version);
      await getCurrentWindow().setTitle(`Copybara v${version}`);
    };

    loadAppVersion();
  }, []);

  useEffect(() => {
    getCurrentWindow().setAlwaysOnTop(alwaysOnTop).catch((error) => {
      console.error("Failed to set always on top:", error);
      showSnackbar("Не вдалося змінити режим поверх вікон");
    });
  }, [alwaysOnTop]);

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
        typography: {
          fontSize: 13,
          h5: { fontSize: "1.25rem" },
          h6: { fontSize: "1.05rem" },
          button: { textTransform: "none" },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              "*": {
                scrollbarWidth: "thin",
                boxSizing: "border-box",
              },
              body: {
                fontSize: "0.92rem",
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
    const handleResize = () => setWindowWidth(window.innerWidth);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const preventDefaultContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener("contextmenu", preventDefaultContextMenu);

    return () => {
      window.removeEventListener("contextmenu", preventDefaultContextMenu);
    };
  }, []);

  useEffect(() => {
    const maxWidth = Math.floor(windowWidth * 0.6);

    if (treePanelWidth > maxWidth) {
      setTreePanelWidth(maxWidth);
      localStorage.setItem("copybara.treePanelWidth", String(maxWidth));
    }
  }, [treePanelWidth, windowWidth]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingTreePanelRef.current) {
        return;
      }

      const nextWidth = Math.min(event.clientX, maxTreePanelWidth);

      if (nextWidth <= hiddenDrawerThreshold) {
        setTreePanelHidden(true);
        return;
      }

      setTreePanelHidden(false);
      setTreePanelWidth(Math.max(nextWidth, minDrawerWidth));
    };

    const handleMouseUp = () => {
      if (!resizingTreePanelRef.current) {
        return;
      }

      resizingTreePanelRef.current = false;
      setIsResizingTreePanel(false);
      localStorage.setItem("copybara.treePanelWidth", String(visibleTreePanelWidth));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [maxTreePanelWidth, visibleTreePanelWidth]);

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
    newFileParentRelativePath,
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

  const openDeleteFileDialog = (node: WorkspaceNode) => {
    setFileToDelete(node);
    setDeleteFileDialogOpen(true);
    closeTreeContextMenu();
  };

  const closeDeleteFileDialog = () => {
    setDeleteFileDialogOpen(false);
    setFileToDelete(null);
  };

  const openDeleteFolderDialog = (node: WorkspaceNode) => {
    setFolderToDelete(node);
    setDeleteFolderDialogOpen(true);
    closeTreeContextMenu();
  };

  const closeDeleteFolderDialog = () => {
    setDeleteFolderDialogOpen(false);
    setFolderToDelete(null);
  };

  const openRenameDialog = (node: WorkspaceNode) => {
    setNodeToRename(node);

    const displayName =
      node.type === "file" && node.name.toLowerCase().endsWith(".txt")
        ? node.name.slice(0, -4)
        : node.name;

    setRenameValue(displayName);
    setRenameDialogOpen(true);
    closeTreeContextMenu();
  };

  const closeRenameDialog = () => {
    setRenameDialogOpen(false);
    setNodeToRename(null);
    setRenameValue("");
  };

  // Функція для перечитування файлу (наприклад, після зовнішніх змін)
  const reloadFile = async (filePath: string) => {
    if (!workspacePath || !filePath) {
      return;
    }

    try {
      const content = await readTextFile(buildFilePath(workspacePath, filePath));

      setWorkspaceContents((current) => ({
        ...current,
        [filePath]: content,
      }));

      if (filePath === selectedFileName) {
        setSearchText("");
        cancelEditingInstruction();
      }

      showSnackbar("Файл перечитано");
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося перечитати файл");
    }
  };

  const reloadCurrentFile = async () => {
    if (!selectedFileName) {
      return;
    }

    await reloadFile(selectedFileName);
  };

  const reloadWorkspaceDirectory = async () => {
    if (!workspacePath) {
      return;
    }

    try {
      await loadWorkspaceFolder(workspacePath);
      showSnackbar("Директорію перечитано");
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося перечитати директорію");
    }
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
    setWorkspaceLoading(true);

    try {
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
    } finally {
      setWorkspaceLoading(false);
    }
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

  const serializeInstructions = (items: Instruction[]) =>
    items
      .map((item) => {
        const command = item.command.trimEnd();
        const description = item.description.trim();

        return description ? `// ${description}\n${command}` : command;
      })
      .join("\n\n") + (items.length > 0 ? "\n" : "");

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

    const updatedContent = serializeInstructions(updatedInstructions);

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

    if (minimizeAfterCopy) {
      await getCurrentWindow().minimize();
    }
  };

  const deleteInstructionFromCurrentFile = async () => {
    if (!selectedFileName || !workspacePath || deleteIndex === null) return;

    const currentContent = workspaceContents[selectedFileName] ?? "";
    const instructions = parseInstructions(currentContent);

    const nextInstructions = instructions.filter((_, index) => index !== deleteIndex);

    const nextContent = serializeInstructions(nextInstructions);

    const selectedFilePath = buildFilePath(workspacePath, selectedFileName);

    await writeTextFile(selectedFilePath, nextContent);

    setWorkspaceContents((prev) => ({
      ...prev,
      [selectedFileName]: nextContent,
    }));

    closeDeleteDialog();
    showSnackbar("Команду видалено");
  };

  const moveInstructionInCurrentFile = async (fromIndex: number, toIndex: number) => {
    if (!workspacePath || !selectedFileName || fromIndex === toIndex) {
      return;
    }

    const currentInstructions = parseInstructions(workspaceContents[selectedFileName] ?? "");

    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= currentInstructions.length ||
      toIndex >= currentInstructions.length
    ) {
      return;
    }

    const previousContent = workspaceContents[selectedFileName] ?? "";
    const nextInstructions = [...currentInstructions];
    const [movedItem] = nextInstructions.splice(fromIndex, 1);
    nextInstructions.splice(toIndex, 0, movedItem);

    const nextContent = serializeInstructions(nextInstructions);

    setWorkspaceContents((current) => ({
      ...current,
      [selectedFileName]: nextContent,
    }));
    setSearchText("");
    cancelEditingInstruction();

    try {
      await writeTextFile(buildFilePath(workspacePath, selectedFileName), nextContent);
      showSnackbar("Порядок команд змінено");
    } catch (error) {
      console.error(error);
      setWorkspaceContents((current) => ({
        ...current,
        [selectedFileName]: previousContent,
      }));
      showSnackbar("Не вдалося зберегти новий порядок");
    }
  };

  const openTreeContextMenu = (
    event: ReactMouseEvent,
    node: WorkspaceNode
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setTreeContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      node,
    });
  };

  const closeTreeContextMenu = () => {
    setTreeContextMenu(null);
  };

  useEffect(() => {
    if (!treeContextMenu) {
      return;
    }

    const handleSecondContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      closeTreeContextMenu();
    };

    window.addEventListener("contextmenu", handleSecondContextMenu, true);

    return () => {
      window.removeEventListener("contextmenu", handleSecondContextMenu, true);
    };
  }, [treeContextMenu]);

  const handleTreeContextAction = async () => {
    if (!treeContextMenu) {
      return;
    }

    const node = treeContextMenu.node;
    closeTreeContextMenu();

    if (node.type === "file") {
      await reloadFile(node.path);
      return;
    }

    openCreateFileDialog(node.path);
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
        const isCollapsed = collapsedFolderPaths.has(node.path);

        return (
          <Box key={`folder-${node.path}`}>
            <ListItemButton
              onClick={() => toggleFolderCollapsed(node.path)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();

                openTreeContextMenu(event, node);
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

            {!isCollapsed && node.children && renderWorkspaceNodes(node.children, level + 1)}
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
            setLastCopiedIndex(null);
          }}
          onContextMenu={(event) => openTreeContextMenu(event, node)}
          sx={{ pl: 2 + level * 3 }}
        >
          <DescriptionIcon sx={{ mr: 1.25, fontSize: 19 }} />

          <ListItemText
            primary={node.name}
            secondary={`${parseInstructions(
              workspaceContents[node.path] ?? ""
            ).length} команд`}
          />
        </ListItemButton>
      );
    });


  const openCreateFileDialog = (parentRelativePath = "") => {
    if (!workspacePath) {
      showSnackbar("Спочатку виберіть папку для роботи");
      return;
    }

    setNewFileParentRelativePath(parentRelativePath);
    setNewFileParentPath(
      parentRelativePath
        ? buildFilePath(workspacePath, parentRelativePath)
        : workspacePath
    );
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

      const createdRelativePath = newFileParentRelativePath
        ? `${newFileParentRelativePath}/${safeFileName}`
        : safeFileName;

      setCreateFileDialogOpen(false);
      setNewFileName("");

      if (workspacePath) {
        await loadWorkspaceFolder(workspacePath);
      }

      setSelectedFileName(createdRelativePath);
      setSearchText("");

      showSnackbar(`Файл "${safeFileName}" створено`);
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося створити файл");
    }
  };

  const openCreateFolderDialog = (parentRelativePath = "") => {
    if (!workspacePath) {
      showSnackbar("Спочатку виберіть папку для роботи");
      return;
    }

    setNewFolderParentRelativePath(parentRelativePath);
    setNewFolderParentPath(
      parentRelativePath
        ? buildFilePath(workspacePath, parentRelativePath)
        : workspacePath
    );
    setNewFolderName("");
    setCreateFolderDialogOpen(true);
    closeTreeContextMenu();
  };

  const handleCreateFolder = async () => {
    if (!newFolderParentPath || !workspacePath) {
      showSnackbar("Спочатку виберіть папку для роботи");
      return;
    }

    const trimmedName = newFolderName.trim();

    if (!trimmedName) {
      showSnackbar("Вкажіть назву папки");
      return;
    }

    if (trimmedName.includes("/") || trimmedName.includes("\\")) {
      showSnackbar("Назва папки не повинна містити / або \\");
      return;
    }

    const fullPath = buildFilePath(newFolderParentPath, trimmedName);
    const initialFilePath = buildFilePath(fullPath, `${trimmedName}.txt`);

    try {
      await mkdir(fullPath);
      await writeTextFile(initialFilePath, "");

      const createdFileRelativePath = newFolderParentRelativePath
        ? `${newFolderParentRelativePath}/${trimmedName}/${trimmedName}.txt`
        : `${trimmedName}/${trimmedName}.txt`;

      setCreateFolderDialogOpen(false);
      setNewFolderName("");

      await loadWorkspaceFolder(workspacePath);

      setSelectedFileName(createdFileRelativePath);
      setSearchText("");

      showSnackbar(`Папку "${trimmedName}" створено`);
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося створити папку");
    }
  };

  const deleteSelectedFile = async () => {
    if (!workspacePath || !fileToDelete || fileToDelete.type !== "file") {
      closeDeleteFileDialog();
      return;
    }

    const filePathToDelete = buildFilePath(workspacePath, fileToDelete.path);

    try {
      await remove(filePathToDelete);

      setWorkspaceContents((current) => {
        const next = { ...current };
        delete next[fileToDelete.path];
        return next;
      });

      const nextFiles = workspaceFiles.filter((filePath) => filePath !== fileToDelete.path);

      await loadWorkspaceFolder(workspacePath);

      if (selectedFileName === fileToDelete.path) {
        setSelectedFileName(nextFiles[0] ?? "");
        setSearchText("");
        cancelEditingInstruction();
      }

      showSnackbar(`Файл "${fileToDelete.name}" видалено`);
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося видалити файл");
    } finally {
      closeDeleteFileDialog();
    }
  };

  const deleteSelectedFolder = async () => {
    if (!workspacePath || !folderToDelete || folderToDelete.type !== "folder") {
      closeDeleteFolderDialog();
      return;
    }

    const folderPathToDelete = buildFilePath(workspacePath, folderToDelete.path);
    const deletedFolderPrefix = `${folderToDelete.path}/`;

    try {
      await remove(folderPathToDelete, { recursive: true });

      const nextFiles = workspaceFiles.filter(
        (filePath) => !filePath.startsWith(deletedFolderPrefix)
      );

      await loadWorkspaceFolder(workspacePath);

      if (
        selectedFileName &&
        selectedFileName.startsWith(deletedFolderPrefix)
      ) {
        setSelectedFileName(nextFiles[0] ?? "");
        setSearchText("");
        setLastCopiedIndex(null);
        cancelEditingInstruction();
      }

      showSnackbar(`Папку "${folderToDelete.name}" видалено`);
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося видалити папку");
    } finally {
      closeDeleteFolderDialog();
    }
  };

  const renameSelectedNode = async () => {
    if (!workspacePath || !nodeToRename) {
      closeRenameDialog();
      return;
    }

    const trimmedName = renameValue.trim();

    if (!trimmedName) {
      showSnackbar("Вкажіть нову назву");
      return;
    }

    if (trimmedName.includes("/") || trimmedName.includes("\\")) {
      showSnackbar("Назва не повинна містити / або \\");
      return;
    }

    const oldFullPath = buildFilePath(workspacePath, nodeToRename.path);

    const parentRelativePath = nodeToRename.path.includes("/")
      ? nodeToRename.path.split("/").slice(0, -1).join("/")
      : "";

    const safeNewName =
      nodeToRename.type === "file" && !trimmedName.toLowerCase().endsWith(".txt")
        ? `${trimmedName}.txt`
        : trimmedName;

    const newRelativePath = parentRelativePath
      ? `${parentRelativePath}/${safeNewName}`
      : safeNewName;

    const newFullPath = buildFilePath(workspacePath, newRelativePath);

    try {
      await rename(oldFullPath, newFullPath);

      await loadWorkspaceFolder(workspacePath);

      if (nodeToRename.type === "file" && selectedFileName === nodeToRename.path) {
        setSelectedFileName(newRelativePath);
        setSearchText("");
        setLastCopiedIndex(null);
        cancelEditingInstruction();
      }

      if (
        nodeToRename.type === "folder" &&
        selectedFileName &&
        selectedFileName.startsWith(`${nodeToRename.path}/`)
      ) {
        const nextSelectedFileName = selectedFileName.replace(
          `${nodeToRename.path}/`,
          `${newRelativePath}/`
        );

        setSelectedFileName(nextSelectedFileName);
        setSearchText("");
        setLastCopiedIndex(null);
        cancelEditingInstruction();
      }

      showSnackbar(
        nodeToRename.type === "file"
          ? `Файл перейменовано на "${safeNewName}"`
          : `Папку перейменовано на "${safeNewName}"`
      );

      closeRenameDialog();
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося перейменувати");
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const toggleMinimizeAfterCopy = (checked: boolean) => {
    setMinimizeAfterCopy(checked);
    localStorage.setItem("copybara.minimizeAfterCopy", String(checked));
  };

  const toggleAlwaysOnTop = () => {
    const nextValue = !alwaysOnTop;

    setAlwaysOnTop(nextValue);
    localStorage.setItem("copybara.alwaysOnTop", String(nextValue));
    showSnackbar(
      nextValue
        ? "Вікно закріплено поверх інших"
        : "Закріплення поверх інших вимкнено"
    );
  };

  const toggleFolderCollapsed = (folderPath: string) => {
    setCollapsedFolderPaths((current) => {
      const next = new Set(current);

      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }

      localStorage.setItem(
        "copybara.collapsedFolderPaths",
        JSON.stringify(Array.from(next))
      );

      return next;
    });
  };

  const getAllFolderPaths = (nodes: WorkspaceNode[]): string[] => {
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

  const collapseAllFolders = () => {
    const allFolderPaths = getAllFolderPaths(workspaceTree);
    const next = new Set(allFolderPaths);

    setCollapsedFolderPaths(next);

    localStorage.setItem(
      "copybara.collapsedFolderPaths",
      JSON.stringify(Array.from(next))
    );

    closeTreeContextMenu();
  };

  const expandAllFolders = () => {
    const next = new Set<string>();

    setCollapsedFolderPaths(next);

    localStorage.setItem(
      "copybara.collapsedFolderPaths",
      JSON.stringify([])
    );

    closeTreeContextMenu();
  };

  const handleRevealTreeNode = async () => {
    if (!workspacePath || !treeContextMenu?.node) {
      closeTreeContextMenu();
      return;
    }

    const targetPath = buildFilePath(workspacePath, treeContextMenu.node.path);

    try {
      await revealItemInDir(targetPath);
    } catch (error) {
      console.error(error);
      showSnackbar("Не вдалося показати у провіднику");
    } finally {
      closeTreeContextMenu();
    }
  };
  // --- --- //

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box
        sx={{
          display: "flex",
          height: "100vh",
          userSelect: isResizingTreePanel ? "none" : "auto",
        }}
      >
        {!treePanelHidden && (
          <Drawer
            variant="permanent"
            sx={{
              width: visibleTreePanelWidth,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: visibleTreePanelWidth,
                boxSizing: "border-box",
                overflowX: "hidden",
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
                  title="Сховати дерево"
                  onClick={() => setTreePanelHidden(true)}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>

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
                    onClick={() => openCreateFileDialog()}
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
                    onClick={() => openCreateFolderDialog()}
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
                  onClick={reloadWorkspaceDirectory}
                  title="Перечитати директорію"
                  sx={{
                    border: "1px solid",
                    borderColor: "primary.main",
                    borderRadius: 1.5,
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <List onContextMenu={(event) => event.preventDefault()}>
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
        )}

        <Box
          onMouseDown={() => {
            resizingTreePanelRef.current = true;
            setIsResizingTreePanel(true);
            setTreePanelHidden(false);
          }}
          title="Потягніть, щоб змінити ширину дерева"
          sx={{
            width: 6,
            flexShrink: 0,
            cursor: "col-resize",
            bgcolor: "divider",
            opacity: treePanelHidden ? 0.65 : 0.35,
            "&:hover": { opacity: 0.9 },
          }}
        />

        {treePanelHidden && (
          <IconButton
            size="small"
            color="primary"
            onClick={() => setTreePanelHidden(false)}
            title="Показати дерево"
            sx={{
              position: "fixed",
              left: 8,
              top: 45,
              zIndex: 1300,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { bgcolor: "background.paper" },
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        )}

        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
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

              <IconButton
                color={alwaysOnTop ? "primary" : "default"}
                onClick={toggleAlwaysOnTop}
                title={
                  alwaysOnTop
                    ? "Вікно закріплено поверх інших"
                    : "Закріпити вікно поверх інших"
                }
              >
                <PushPinIcon />
              </IconButton>

              <IconButton onClick={() => setDarkMode((v) => !v)}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Toolbar>
          </AppBar>

          <Box sx={{ px: 3, pb: 3, overflow: "auto" }}>
            {workspaceLoading ? (
              <Card sx={{ mt: 3 }}>
                <CardContent sx={{ textAlign: "center", py: 6 }}>
                  <CircularProgress color="primary" sx={{ mb: 2 }} />

                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    Завантаження директорії...
                  </Typography>

                  <Typography color="text.secondary">
                    Copybara сканує папки та читає .txt файли. Це може зайняти трохи часу.
                  </Typography>
                </CardContent>
              </Card>
            ) : !workspacePath ? (
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

                    <IconButton
                      color={minimizeAfterCopy ? "primary" : "default"}
                      onClick={() => toggleMinimizeAfterCopy(!minimizeAfterCopy)}
                      title={
                        minimizeAfterCopy
                          ? "Згортання після копіювання увімкнено"
                          : "Згортати після копіювання"
                      }
                      disabled={!workspacePath || !selectedFileName}
                    >
                      <BrandingWatermarkIcon />
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
                      onDragOver={(event) => {
                        if (draggedInstructionIndex === null || editingIndex !== null) {
                          return;
                        }

                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDragOverInstructionIndex(index);
                      }}
                      onDrop={async (event) => {
                        event.preventDefault();

                        if (
                          draggedInstructionIndex === null ||
                          draggedInstructionIndex === index ||
                          !workspacePath ||
                          !selectedFileName
                        ) {
                          setDraggedInstructionIndex(null);
                          setDragOverInstructionIndex(null);
                          return;
                        }

                        await moveInstructionInCurrentFile(draggedInstructionIndex, index);

                        setDraggedInstructionIndex(null);
                        setDragOverInstructionIndex(null);
                      }}
                      sx={{
                        mb: 2,
                        border: "2px solid",
                        borderColor:
                          dragOverInstructionIndex === index
                            ? "primary.main"
                            : hasReplacementMatch
                              ? "primary.main"
                              : "transparent",
                        boxShadow: hasReplacementMatch || dragOverInstructionIndex === index ? 6 : undefined,
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
                            alignItems: "center",
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
                          <IconButton
                            size="small"
                            draggable={editingIndex !== index}
                            onDragStart={(event) => {
                              if (editingIndex === index) {
                                event.preventDefault();
                                return;
                              }

                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", String(index));
                              setDraggedInstructionIndex(index);
                            }}
                            onDragEnd={() => {
                              setDraggedInstructionIndex(null);
                              setDragOverInstructionIndex(null);
                            }}
                            title="Перетягнути команду"
                            sx={{
                              cursor: editingIndex === index ? "default" : "grab",
                              mt: "2px",
                              color: "text.secondary",
                              "&:hover": {
                                color: "primary.main",
                              },
                              "&:active": {
                                cursor: "grabbing",
                              },
                            }}
                            disabled={editingIndex === index}
                          >
                            <DragIndicatorIcon fontSize="small" />
                          </IconButton>

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

      <Menu
        open={Boolean(treeContextMenu)}
        onClose={closeTreeContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          treeContextMenu
            ? { top: treeContextMenu.mouseY, left: treeContextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleTreeContextAction}>
          {treeContextMenu?.node.type === "file" ? (
            <>
              <RefreshIcon fontSize="small" sx={{ mr: 1.5 }} />
              Перечитати файл
            </>
          ) : (
            <>
              <AddIcon fontSize="small" sx={{ mr: 1.5 }} />
              Створити файл у цій папці
            </>
          )}
        </MenuItem>

        {treeContextMenu?.node.type === "folder" && (
          <MenuItem
            onClick={() => {
              if (treeContextMenu?.node.type === "folder") {
                openCreateFolderDialog(treeContextMenu.node.path);
              }
            }}
          >
            <CreateNewFolderIcon fontSize="small" sx={{ mr: 1.5 }} />
            Створити папку в цій папці
          </MenuItem>
        )}

        {treeContextMenu?.node.type === "folder" && (
          <MenuItem
            onClick={() => {
              if (treeContextMenu?.node.type === "folder") {
                openRenameDialog(treeContextMenu.node);
              }
            }}
          >
            <DriveFileRenameOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
            Перейменувати папку
          </MenuItem>
        )}

        {treeContextMenu?.node.type === "folder" && (
          <MenuItem
            onClick={() => {
              if (treeContextMenu?.node.type === "folder") {
                openDeleteFolderDialog(treeContextMenu.node);
              }
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
            Видалити папку
          </MenuItem>
        )}

        <MenuItem onClick={handleRevealTreeNode}>
          <OpenInNewIcon fontSize="small" sx={{ mr: 1.5 }} />
          Показати у провіднику
        </MenuItem>

        {treeContextMenu?.node.type === "file" && (
          <MenuItem
            onClick={() => {
              if (treeContextMenu?.node.type === "file") {
                openRenameDialog(treeContextMenu.node);
              }
            }}
          >
            <DriveFileRenameOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
            Перейменувати файл
          </MenuItem>
        )}

        {treeContextMenu?.node.type === "file" && (
          <MenuItem
            onClick={() => {
              if (treeContextMenu?.node.type === "file") {
                openDeleteFileDialog(treeContextMenu.node);
              }
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
            Видалити файл
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={collapseAllFolders}>
          <UnfoldLessIcon fontSize="small" sx={{ mr: 1.5 }} />
          Згорнути все
        </MenuItem>

        <MenuItem onClick={expandAllFolders}>
          <UnfoldMoreIcon fontSize="small" sx={{ mr: 1.5 }} />
          Розгорнути все
        </MenuItem>

        {treeContextMenu?.node.type === "file" && [
          <Divider key="divider" />,
          <MenuItem
            key="select"
            onClick={() => {
              if (treeContextMenu?.node.type === "file") {
                setSelectedFileName(treeContextMenu.node.path);
                setSearchText("");
                setLastCopiedIndex(null);
              }

              closeTreeContextMenu();
            }}
          >
            <DescriptionIcon fontSize="small" sx={{ mr: 1.5 }} />
            Відкрити файл
          </MenuItem>,
        ]}
      </Menu>

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
            sx={{ mt: 1 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Файл буде створено {newFileParentRelativePath ? `у папці ${newFileParentRelativePath}` : "у вибраній папці"}. Розширення .txt можна не писати.
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
        open={createFolderDialogOpen}
        onClose={() => setCreateFolderDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Створити нову папку</DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Назва папки"
            placeholder="Наприклад: linux"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && newFolderName.trim()) {
                handleCreateFolder();
              }
            }}
            sx={{ mt: 1 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Папку буде створено {newFolderParentRelativePath ? `у папці ${newFolderParentRelativePath}` : "у вибраній папці"}.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateFolderDialogOpen(false)}>
            Скасувати
          </Button>

          <Button
            variant="contained"
            disabled={!newFolderName.trim()}
            onClick={handleCreateFolder}
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
            sx={{ mt: 1 }}
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

      <Dialog open={deleteFileDialogOpen} onClose={closeDeleteFileDialog}>
        <DialogTitle>Видалити файл?</DialogTitle>

        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Файл буде видалено з диска:
          </Typography>

          <Typography
            color="error"
            sx={{
              fontFamily: "Consolas, monospace",
              wordBreak: "break-all",
            }}
          >
            {fileToDelete?.path}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDeleteFileDialog}>
            Скасувати
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={deleteSelectedFile}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteFolderDialogOpen} onClose={closeDeleteFolderDialog}>
        <DialogTitle>Видалити папку?</DialogTitle>

        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Папку буде видалено з диска разом з усіма файлами всередині:
          </Typography>

          <Typography
            color="error"
            sx={{
              fontFamily: "Consolas, monospace",
              wordBreak: "break-all",
            }}
          >
            {folderToDelete?.path}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDeleteFolderDialog}>
            Скасувати
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={deleteSelectedFolder}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={renameDialogOpen}
        onClose={closeRenameDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {nodeToRename?.type === "file" ? "Перейменувати файл" : "Перейменувати папку"}
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Нова назва"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && renameValue.trim()) {
                renameSelectedNode();
              }
            }}
            sx={{ mt: 1 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Поточна назва: {nodeToRename?.name}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeRenameDialog}>
            Скасувати
          </Button>

          <Button
            variant="contained"
            disabled={!renameValue.trim()}
            onClick={renameSelectedNode}
          >
            Перейменувати
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