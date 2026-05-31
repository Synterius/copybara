import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

type AddCommandDialogProps = {
  open: boolean;
  selectedFileName: string | null;
  newDescription: string;
  newCommand: string;
  onDescriptionChange: (value: string) => void;
  onCommandChange: (value: string) => void;
  onClose: () => void;
  onAdd: () => void;
};

export default function AddCommandDialog({
  open,
  selectedFileName,
  newDescription,
  newCommand,
  onDescriptionChange,
  onCommandChange,
  onClose,
  onAdd,
}: AddCommandDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Додати команду</DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          label="Пояснення"
          placeholder="Наприклад: Перезапуск сервісу"
          value={newDescription}
          onChange={(event) => onDescriptionChange(event.target.value)}
          fullWidth
          sx={{ mt: 1 }}
        />

        <TextField
          label="Текст для копіювання"
          placeholder="Команда або багаторядковий блок"
          value={newCommand}
          onChange={(event) => onCommandChange(event.target.value)}
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
        <Button onClick={onClose}>
          Скасувати
        </Button>

        <Button
          variant="contained"
          disabled={!selectedFileName || !newCommand.trim()}
          onClick={onAdd}
        >
          Додати
        </Button>
      </DialogActions>
    </Dialog>
  );
}