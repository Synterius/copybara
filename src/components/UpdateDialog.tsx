import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

type UpdateDialogProps = {
  open: boolean;
  title: string;
  message: string;
  hasUpdate: boolean;
  isInstalling: boolean;
  onClose: () => void;
  onInstall: () => void;
};

export default function UpdateDialog({
  open,
  title,
  message,
  hasUpdate,
  isInstalling,
  onClose,
  onInstall,
}: UpdateDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={isInstalling ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        <Typography sx={{ whiteSpace: "pre-line" }}>
          {message}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          disabled={isInstalling}
        >
          {hasUpdate ? "Пізніше" : "Закрити"}
        </Button>

        {hasUpdate && (
          <Button
            variant="contained"
            onClick={onInstall}
            disabled={isInstalling}
          >
            {isInstalling ? "Встановлення..." : "Оновити"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}