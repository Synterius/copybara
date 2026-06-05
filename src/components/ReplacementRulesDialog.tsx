import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneAllIcon from "@mui/icons-material/DoneAll";

import type { ReplacementRule } from "../types/replacement";

type ReplacementRulesDialogProps = {
  open: boolean;
  rules: ReplacementRule[];
  onClose: () => void;
  onAddRule: () => void;
  onDeleteRule: (id: string) => void;
  onUpdateRule: (
    id: string,
    field: "from" | "to",
    value: string
  ) => void;
  onApplyRule: (rule: ReplacementRule) => void;
};

export default function ReplacementRulesDialog({
  open,
  rules,
  onClose,
  onAddRule,
  onDeleteRule,
  onUpdateRule,
  onApplyRule,
}: ReplacementRulesDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Список замін</DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {rules.map((rule, index) => (
            <Box
              key={rule.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "18px minmax(120px, 1fr) minmax(120px, 1fr) auto auto",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Box
                title={index === 0 ? "Основна заміна" : `Заміна ${index + 1}`}
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  bgcolor: rule.color,
                  boxShadow: `0 0 0 3px ${rule.color}22`,
                }}
              />

              <TextField
                fullWidth
                size="small"
                label={index === 0 ? "Що замінити" : `Що замінити ${index + 1}`}
                value={rule.from}
                onChange={(event) =>
                  onUpdateRule(rule.id, "from", event.target.value)
                }
              />

              <TextField
                fullWidth
                size="small"
                label={index === 0 ? "На що замінити" : `На що замінити ${index + 1}`}
                value={rule.to}
                onChange={(event) =>
                  onUpdateRule(rule.id, "to", event.target.value)
                }
              />

              <IconButton
                onClick={() => onApplyRule(rule)}
                title="Застосувати це правило до файлу"
                disabled={!rule.from}
              >
                <DoneAllIcon />
              </IconButton>

              <IconButton
                color="error"
                title={
                  index === 0
                    ? "Першу заміну не можна видалити"
                    : "Видалити заміну"
                }
                disabled={index === 0}
                onClick={() => onDeleteRule(rule.id)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          startIcon={<AddIcon />}
          onClick={onAddRule}
        >
          Додати заміну
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <Button onClick={onClose}>
          Закрити
        </Button>
      </DialogActions>
    </Dialog>
  );
}