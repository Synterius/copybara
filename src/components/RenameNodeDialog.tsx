import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

import type { WorkspaceNode } from "../types/copybara";

type RenameNodeDialogProps = {
  open: boolean;
  nodeToRename: WorkspaceNode | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onClose: () => void;
  onRename: () => void;
};

export default function RenameNodeDialog({
  open,
  nodeToRename,
  renameValue,
  onRenameValueChange,
  onClose,
  onRename,
}: RenameNodeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>
        {nodeToRename?.type === "file"
          ? "Перейменувати файл"
          : "Перейменувати папку"}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <TextField
          autoFocus
          fullWidth
          label="Нова назва"
          value={renameValue}
          onChange={(event) => onRenameValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && renameValue.trim()) {
              onRename();
            }
          }}
          sx={{ mt: 1 }}
        />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5 }}
        >
          Поточна назва: {nodeToRename?.name}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Скасувати
        </Button>

        <Button
          variant="contained"
          disabled={!renameValue.trim()}
          onClick={onRename}
        >
          Перейменувати
        </Button>
      </DialogActions>
    </Dialog>
  );
}