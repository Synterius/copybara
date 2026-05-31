import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  confirmColor?: "primary" | "error";
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  details,
  confirmText = "Підтвердити",
  confirmColor = "primary",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        <Typography sx={{ mb: details ? 1 : 0 }}>
          {message}
        </Typography>

        {details && (
          <Typography
            color={confirmColor === "error" ? "error" : "text.secondary"}
            sx={{
              fontFamily: "Consolas, monospace",
              wordBreak: "break-all",
            }}
          >
            {details}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Скасувати
        </Button>

        <Button
          color={confirmColor}
          variant="contained"
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}