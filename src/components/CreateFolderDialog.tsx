import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

type CreateFolderDialogProps = {
  open: boolean;
  newFolderName: string;
  parentRelativePath: string;
  onFolderNameChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
};

export default function CreateFolderDialog({
  open,
  newFolderName,
  parentRelativePath,
  onFolderNameChange,
  onClose,
  onCreate,
}: CreateFolderDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          onChange={(event) => onFolderNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && newFolderName.trim()) {
              onCreate();
            }
          }}
          sx={{ mt: 1 }}
        />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5 }}
        >
          Папку буде створено{" "}
          {parentRelativePath
            ? `у папці ${parentRelativePath}`
            : "у вибраній папці"}
          .
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Скасувати
        </Button>

        <Button
          variant="contained"
          disabled={!newFolderName.trim()}
          onClick={onCreate}
        >
          Створити
        </Button>
      </DialogActions>
    </Dialog>
  );
}