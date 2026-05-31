import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

type CreateFileDialogProps = {
  open: boolean;
  newFileName: string;
  parentRelativePath: string;
  onFileNameChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
};

export default function CreateFileDialog({
  open,
  newFileName,
  parentRelativePath,
  onFileNameChange,
  onClose,
  onCreate,
}: CreateFileDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          onChange={(event) => onFileNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && newFileName.trim()) {
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
          Файл буде створено{" "}
          {parentRelativePath
            ? `у папці ${parentRelativePath}`
            : "у вибраній папці"}
          . Розширення .txt можна не писати.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Скасувати
        </Button>

        <Button
          variant="contained"
          disabled={!newFileName.trim()}
          onClick={onCreate}
        >
          Створити
        </Button>
      </DialogActions>
    </Dialog>
  );
}