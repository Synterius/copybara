import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Box,
  Card,
  CardContent,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  Snackbar,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";

// === Іконки === //
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
// === === //

// === API та утиліти Tauri === //
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, readTextFile, writeTextFile, remove, rename } from "@tauri-apps/plugin-fs";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
// ===  === //

// === Компоненти === //
import type {
  Instruction,
  WorkspaceNode,
  TreeContextMenu,
} from "./types/copybara";

import {
  parseInstructions,
  serializeInstructions,
} from "./utils/instructionUtils";

import { buildFilePath } from "./utils/pathUtils";
import type { ReplacementRule } from "./types/replacement";
import ReplacementRulesDialog from "./components/ReplacementRulesDialog";
import { loadWorkspaceData } from "./services/workspaceService";

import {
  applyReplacementRules,
  createReplacementRule,
  getActiveReplacementRules,
  primaryReplacementColor,
} from "./utils/replacementUtils";

import {
  validateNewFileName,
  validateNodeName,
} from "./utils/nameValidationUtils";

import {
  getAllFolderPaths,
  getFolderAncestorPaths,
} from "./utils/treeUtils";

import AddCommandDialog from "./components/AddCommandDialog";
import CreateFileDialog from "./components/CreateFileDialog";
import CreateFolderDialog from "./components/CreateFolderDialog";
import RenameNodeDialog from "./components/RenameNodeDialog";
import ConfirmDialog from "./components/ConfirmDialog";
import UpdateDialog from "./components/UpdateDialog";
import TopBar from "./components/TopBar";
import WorkspaceSidebarHeader from "./components/WorkspaceSidebarHeader";
import WorkspaceTree from "./components/WorkspaceTree";
import WorkspaceTreeContextMenu from "./components/WorkspaceTreeContextMenu";
import CurrentFileHeader from "./components/CurrentFileHeader";
import InstructionCard from "./components/InstructionCard";
import ReplacementHighlightedCommand from "./components/ReplacementHighlightedCommand";
import WorkspaceStateView from "./components/WorkspaceStateView";
// ===  === //

const defaultDrawerWidth = 280;
const minDrawerWidth = 248;
const hiddenDrawerThreshold = 248;

function App() {
  const [appVersion, setAppVersion] = useState("");
  const [darkMode, setDarkMode] = useState(true);

  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    localStorage.getItem("copybara.selectedFileName")
  );
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
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isResizingTreePanel, setIsResizingTreePanel] = useState(false);
  const [draggedInstructionIndex, setDraggedInstructionIndex] = useState<number | null>(null);
  const [dragOverInstructionIndex, setDragOverInstructionIndex] = useState<number | null>(null);

  const [searchText, setSearchText] = useState("");
  const [replacementVisible, setReplacementVisible] = useState(false);
  const [replacementRules, setReplacementRules] = useState<ReplacementRule[]>(() => [
    createReplacementRule(0),
  ]);
  const [replacementDialogOpen, setReplacementDialogOpen] = useState(false);
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

  const firstReplacementRule = replacementRules[0] ?? createReplacementRule(0);

  const activeReplacementRules = getActiveReplacementRules(
    replacementVisible,
    replacementRules
  );

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

      const isSearchShortcut =
        isCtrl &&
        !event.shiftKey &&
        !event.altKey &&
        event.code === "KeyF";

      if (isSearchShortcut) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (!workspacePath || !selectedFileName) {
          return;
        }

        const selectedText = window.getSelection()?.toString().trim() ?? "";

        if (selectedText) {
          setSearchText(selectedText);
        }

        setTimeout(() => {
          searchInputRef.current?.focus();

          if (selectedText) {
            searchInputRef.current?.setSelectionRange(
              selectedText.length,
              selectedText.length
            );
          } else {
            searchInputRef.current?.select();
          }
        }, 0);

        return;
      }

      const isReplaceShortcut =
        isCtrl &&
        !event.shiftKey &&
        !event.altKey &&
        event.code === "KeyR";

      if (isReplaceShortcut) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (!workspacePath || !selectedFileName) {
          return;
        }

        const selectedText = window.getSelection()?.toString().trim() ?? "";

        setReplacementVisible((current) => {
          if (selectedText) {
            setReplacementRules((rules) =>
              rules.map((rule, index) =>
                index === 0
                  ? {
                    ...rule,
                    from: selectedText,
                    color: primaryReplacementColor,
                  }
                  : rule
              )
            );
            return true;
          }

          return !current;
        });

        return;
      }

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

    window.addEventListener("keydown", handleGlobalShortcuts, true);

    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts, true);
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
    replacementVisible,
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

  const loadWorkspaceFolder = async (folderPath: string) => {
    setWorkspaceLoading(true);

    try {
      const { nodes, files, contents } = await loadWorkspaceData(folderPath);

      setWorkspaceTree(nodes);
      setWorkspaceFiles(files);
      setWorkspaceContents(contents);

      const savedSelectedFile = localStorage.getItem("copybara.selectedFileName");
      const firstFile = files[0];

      if (firstFile) {
        const nextSelectedFile =
          savedSelectedFile && files.includes(savedSelectedFile)
            ? savedSelectedFile
            : firstFile;

        setSelectedFileName(nextSelectedFile);
        localStorage.setItem("copybara.selectedFileName", nextSelectedFile);
      } else {
        setSelectedFileName("");
        localStorage.removeItem("copybara.selectedFileName");
      }

      setSearchText("");
      cancelEditingInstruction();
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const updateReplacementRule = (
    id: string,
    field: "from" | "to",
    value: string
  ) => {
    setReplacementRules((current) =>
      current.map((rule) =>
        rule.id === id
          ? {
            ...rule,
            [field]: value,
          }
          : rule
      )
    );
  };

  const clearReplacementRules = () => {
    setReplacementRules((current) => [
      {
        ...(current[0] ?? createReplacementRule(0)),
        from: "",
        to: "",
        color: primaryReplacementColor,
      },
    ]);
  };

  const addReplacementRule = () => {
    setReplacementRules((current) => [
      ...current,
      createReplacementRule(current.length),
    ]);
  };

  const deleteReplacementRule = (id: string) => {
    setReplacementRules((current) => {
      if (current.length <= 1 || current[0]?.id === id) {
        return current;
      }

      return current.filter((rule) => rule.id !== id);
    });
  };

  const applyReplacement = (text: string) => {
    return applyReplacementRules(text, activeReplacementRules);
  };

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

    const validationError = validateNewFileName(newFileName);

    if (validationError) {
      showSnackbar(validationError);
      return;
    }

    const trimmedName = newFileName.trim();

    const safeFileName = trimmedName.toLowerCase().endsWith(".txt")
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

    const validationError = validateNodeName(newFolderName);

    if (validationError) {
      showSnackbar(validationError);
      return;
    }

    const trimmedName = newFolderName.trim();

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

    const validationError =
      nodeToRename.type === "file"
        ? validateNewFileName(renameValue)
        : validateNodeName(renameValue);

    if (validationError) {
      showSnackbar(validationError);
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

  const activateFolder = (folderPath: string) => {
    const allFolderPaths = getAllFolderPaths(workspaceTree);
    const pathsToKeepOpen = new Set([
      ...getFolderAncestorPaths(folderPath),
      folderPath,
    ]);

    const next = new Set(
      allFolderPaths.filter((path) => !pathsToKeepOpen.has(path))
    );

    setCollapsedFolderPaths(next);

    localStorage.setItem(
      "copybara.collapsedFolderPaths",
      JSON.stringify(Array.from(next))
    );

    closeTreeContextMenu();
    showSnackbar("Папку зроблено активною");
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
            <WorkspaceSidebarHeader
              appVersion={appVersion}
              workspacePath={workspacePath}
              availableUpdateVersion={availableUpdateVersion}
              onHideTreePanel={() => setTreePanelHidden(true)}
              onCheckForUpdates={checkForUpdates}
              onCreateFile={() => openCreateFileDialog()}
              onCreateFolder={() => openCreateFolderDialog()}
              onReloadWorkspaceDirectory={reloadWorkspaceDirectory}
            />

            <List onContextMenu={(event) => event.preventDefault()}>
              {workspaceFiles.length > 0 ? (
                <WorkspaceTree
                  nodes={workspaceTree}
                  selectedFileName={selectedFileName}
                  collapsedFolderPaths={collapsedFolderPaths}
                  workspaceContents={workspaceContents}
                  onToggleFolder={toggleFolderCollapsed}
                  onSelectFile={(filePath) => {
                    setSelectedFileName(filePath);
                    localStorage.setItem("copybara.selectedFileName", filePath);
                    setSearchText("");
                    setLastCopiedIndex(null);
                  }}
                  onOpenContextMenu={openTreeContextMenu}
                />
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
          <TopBar
            darkMode={darkMode}
            alwaysOnTop={alwaysOnTop}
            selectedFileName={selectedFileName}
            searchText={searchText}
            searchInputRef={searchInputRef}
            onSearchTextChange={setSearchText}
            onOpenWorkspaceFolder={openWorkspaceFolder}
            onToggleAlwaysOnTop={toggleAlwaysOnTop}
            onToggleDarkMode={() => setDarkMode((value) => !value)}
          />

          <Box sx={{ px: 3, pb: 3, overflow: "auto" }}>
            {workspaceLoading ? (
              <WorkspaceStateView
                type="loading"
                onOpenWorkspaceFolder={openWorkspaceFolder}
              />
            ) : !workspacePath ? (
              <WorkspaceStateView
                type="no-workspace"
                onOpenWorkspaceFolder={openWorkspaceFolder}
              />
            ) : workspaceFiles.length === 0 ? (
              <WorkspaceStateView
                type="no-files"
                onOpenWorkspaceFolder={openWorkspaceFolder}
              />
            ) : (
              <>
                <CurrentFileHeader
                  selectedFileName={selectedFileName}
                  workspacePath={workspacePath}
                  filteredInstructionsCount={filteredInstructions.length}
                  instructionsCount={instructions.length}
                  replacementVisible={replacementVisible}
                  minimizeAfterCopy={minimizeAfterCopy}
                  replaceFrom={firstReplacementRule.from}
                  replaceTo={firstReplacementRule.to}
                  replacementRulesCount={replacementRules.length}
                  onAddCommand={() => setAddDialogOpen(true)}
                  onReloadCurrentFile={reloadCurrentFile}
                  onToggleReplacementVisible={() => setReplacementVisible((value) => !value)}
                  onToggleMinimizeAfterCopy={() => toggleMinimizeAfterCopy(!minimizeAfterCopy)}
                  onReplaceFromChange={(value) =>
                    updateReplacementRule(firstReplacementRule.id, "from", value)
                  }
                  onReplaceToChange={(value) =>
                    updateReplacementRule(firstReplacementRule.id, "to", value)
                  }
                  onClearReplacement={clearReplacementRules}
                  onOpenReplacementRulesDialog={() => setReplacementDialogOpen(true)}
                />

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
                  const matchedReplacementRules = activeReplacementRules.filter((rule) =>
                    item.command.includes(rule.from)
                  );

                  const hasReplacementMatch = matchedReplacementRules.length > 0;

                  return (
                    <InstructionCard
                      key={index}
                      item={item}
                      index={index}
                      editingIndex={editingIndex}
                      editDescription={editDescription}
                      editCommand={editCommand}
                      lastCopiedIndex={lastCopiedIndex}
                      dragOverInstructionIndex={dragOverInstructionIndex}
                      hasReplacementMatch={hasReplacementMatch}
                      matchedReplacementRules={matchedReplacementRules}
                      renderedCommand={
                        <ReplacementHighlightedCommand
                          text={item.command}
                          activeRules={activeReplacementRules}
                        />
                      }
                      onStartEdit={startEditingInstruction}
                      onEditDescriptionChange={setEditDescription}
                      onEditCommandChange={setEditCommand}
                      onCancelEdit={cancelEditingInstruction}
                      onSaveEdit={saveEditingInstruction}
                      onCopy={() => copyCommand(applyReplacement(item.command), index)}
                      onDelete={() => openDeleteDialog(index)}
                      onDragStart={(event, currentIndex) => {
                        if (editingIndex === currentIndex) {
                          event.preventDefault();
                          return;
                        }

                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(currentIndex));
                        setDraggedInstructionIndex(currentIndex);
                      }}
                      onDragEnd={() => {
                        setDraggedInstructionIndex(null);
                        setDragOverInstructionIndex(null);
                      }}
                      onDragOver={(event, currentIndex) => {
                        if (draggedInstructionIndex === null || editingIndex !== null) {
                          return;
                        }

                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDragOverInstructionIndex(currentIndex);
                      }}
                      onDrop={async (event, currentIndex) => {
                        event.preventDefault();

                        if (
                          draggedInstructionIndex === null ||
                          draggedInstructionIndex === currentIndex ||
                          !workspacePath ||
                          !selectedFileName
                        ) {
                          setDraggedInstructionIndex(null);
                          setDragOverInstructionIndex(null);
                          return;
                        }

                        await moveInstructionInCurrentFile(draggedInstructionIndex, currentIndex);

                        setDraggedInstructionIndex(null);
                        setDragOverInstructionIndex(null);
                      }}
                    />
                  );
                })}
              </>
            )}
          </Box>
        </Box>
      </Box>

      <WorkspaceTreeContextMenu
        contextMenu={treeContextMenu}
        onClose={closeTreeContextMenu}
        onPrimaryAction={handleTreeContextAction}
        onCreateFolder={(folderPath) => {
          openCreateFolderDialog(folderPath);
        }}
        onRenameNode={openRenameDialog}
        onDeleteFolder={openDeleteFolderDialog}
        onDeleteFile={openDeleteFileDialog}
        onRevealNode={handleRevealTreeNode}
        onCollapseAll={collapseAllFolders}
        onExpandAll={expandAllFolders}
        onActivateFolder={activateFolder}
        onOpenFile={(filePath) => {
          setSelectedFileName(filePath);
          localStorage.setItem("copybara.selectedFileName", filePath);
          setSearchText("");
          setLastCopiedIndex(null);
          closeTreeContextMenu();
        }}
      />

      <CreateFileDialog
        open={createFileDialogOpen}
        newFileName={newFileName}
        parentRelativePath={newFileParentRelativePath}
        onFileNameChange={setNewFileName}
        onClose={() => setCreateFileDialogOpen(false)}
        onCreate={handleCreateFile}
      />

      <CreateFolderDialog
        open={createFolderDialogOpen}
        newFolderName={newFolderName}
        parentRelativePath={newFolderParentRelativePath}
        onFolderNameChange={setNewFolderName}
        onClose={() => setCreateFolderDialogOpen(false)}
        onCreate={handleCreateFolder}
      />

      <AddCommandDialog
        open={addDialogOpen}
        selectedFileName={selectedFileName}
        newDescription={newDescription}
        newCommand={newCommand}
        onDescriptionChange={setNewDescription}
        onCommandChange={setNewCommand}
        onClose={() => setAddDialogOpen(false)}
        onAdd={addCommandToCurrentFile}
      />

      <ConfirmDialog
        open={deleteFileDialogOpen}
        title="Видалити файл?"
        message="Файл буде видалено з диска:"
        details={fileToDelete?.path}
        confirmText="Видалити"
        confirmColor="error"
        onClose={closeDeleteFileDialog}
        onConfirm={deleteSelectedFile}
      />

      <ConfirmDialog
        open={deleteFolderDialogOpen}
        title="Видалити папку?"
        message="Папку буде видалено з диска разом з усіма файлами всередині:"
        details={folderToDelete?.path}
        confirmText="Видалити"
        confirmColor="error"
        onClose={closeDeleteFolderDialog}
        onConfirm={deleteSelectedFolder}
      />

      <RenameNodeDialog
        open={renameDialogOpen}
        nodeToRename={nodeToRename}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        onClose={closeRenameDialog}
        onRename={renameSelectedNode}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Видалити команду?"
        message="Цю команду буде видалено з поточного .txt файлу."
        confirmText="Видалити"
        confirmColor="error"
        onClose={closeDeleteDialog}
        onConfirm={deleteInstructionFromCurrentFile}
      />

      <UpdateDialog
        open={updateDialogOpen}
        title={updateDialogTitle}
        message={updateDialogMessage}
        hasUpdate={Boolean(updateToInstall)}
        isInstalling={isInstallingUpdate}
        onClose={() => setUpdateDialogOpen(false)}
        onInstall={installSelectedUpdate}
      />

      <ReplacementRulesDialog
        open={replacementDialogOpen}
        rules={replacementRules}
        onClose={() => setReplacementDialogOpen(false)}
        onAddRule={addReplacementRule}
        onDeleteRule={deleteReplacementRule}
        onUpdateRule={updateReplacementRule}
      />

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