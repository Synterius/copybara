import {
    Divider,
    Menu,
    MenuItem,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

import type { TreeContextMenu, WorkspaceNode } from "../types/copybara";

type WorkspaceTreeContextMenuProps = {
    contextMenu: TreeContextMenu;
    onClose: () => void;
    onPrimaryAction: () => void;
    onCreateFolder: (folderPath: string) => void;
    onRenameNode: (node: WorkspaceNode) => void;
    onDeleteFolder: (node: WorkspaceNode) => void;
    onDeleteFile: (node: WorkspaceNode) => void;
    onRevealNode: () => void;
    onCollapseAll: () => void;
    onExpandAll: () => void;
    onActivateFolder: (folderPath: string) => void;
    onOpenFile: (filePath: string) => void;
};

export default function WorkspaceTreeContextMenu({
    contextMenu,
    onClose,
    onPrimaryAction,
    onCreateFolder,
    onRenameNode,
    onDeleteFolder,
    onDeleteFile,
    onRevealNode,
    onCollapseAll,
    onExpandAll,
    onActivateFolder,
    onOpenFile,
}: WorkspaceTreeContextMenuProps) {
    const node = contextMenu?.node;

    return (
        <Menu
            open={Boolean(contextMenu)}
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={
                contextMenu
                    ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                    : undefined
            }
        >
            <MenuItem onClick={onPrimaryAction}>
                {node?.type === "file" ? (
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

            {node?.type === "folder" && (
                <MenuItem onClick={() => onCreateFolder(node.path)}>
                    <CreateNewFolderIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Створити папку в цій папці
                </MenuItem>
            )}

            <MenuItem onClick={onRevealNode}>
                <OpenInNewIcon fontSize="small" sx={{ mr: 1.5 }} />
                Показати у провіднику
            </MenuItem>

            {node?.type === "folder" && (
                <MenuItem onClick={() => onRenameNode(node)}>
                    <DriveFileRenameOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Перейменувати папку
                </MenuItem>
            )}

            {node?.type === "folder" && (
                <MenuItem
                    onClick={() => onDeleteFolder(node)}
                    sx={{ color: "error.main" }}
                >
                    <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Видалити папку
                </MenuItem>
            )}



            {node?.type === "file" && (
                <MenuItem onClick={() => onRenameNode(node)}>
                    <DriveFileRenameOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Перейменувати файл
                </MenuItem>
            )}

            {node?.type === "file" && (
                <MenuItem
                    onClick={() => onDeleteFile(node)}
                    sx={{ color: "error.main" }}
                >
                    <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Видалити файл
                </MenuItem>
            )}

            <Divider />

            <MenuItem onClick={onCollapseAll}>
                <UnfoldLessIcon fontSize="small" sx={{ mr: 1.5 }} />
                Згорнути все
            </MenuItem>

            {node?.type === "folder" && (
                <MenuItem onClick={() => onActivateFolder(node.path)}>
                    <MyLocationIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Зробити активною
                </MenuItem>
            )}

            <MenuItem onClick={onExpandAll}>
                <UnfoldMoreIcon fontSize="small" sx={{ mr: 1.5 }} />
                Розгорнути все
            </MenuItem>

            {node?.type === "file" && [
                <Divider key="divider" />,
                <MenuItem
                    key="select"
                    onClick={() => onOpenFile(node.path)}
                >
                    <DescriptionIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Відкрити файл
                </MenuItem>,
            ]}
        </Menu>
    );
}