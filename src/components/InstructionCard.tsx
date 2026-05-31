import type { DragEvent, ReactNode } from "react";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SaveIcon from "@mui/icons-material/Save";

import type { Instruction } from "../types/copybara";
import type { ReplacementRule } from "../types/replacement";

type InstructionCardProps = {
  item: Instruction;
  index: number;

  editingIndex: number | null;
  editDescription: string;
  editCommand: string;

  lastCopiedIndex: number | null;
  dragOverInstructionIndex: number | null;

  hasReplacementMatch: boolean;
  matchedReplacementRules: ReplacementRule[];

  renderedCommand: ReactNode;

  onStartEdit: (index: number, item: Instruction) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditCommandChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;

  onDragStart: (event: DragEvent<HTMLButtonElement>, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, index: number) => void;
};

export default function InstructionCard({
  item,
  index,
  editingIndex,
  editDescription,
  editCommand,
  lastCopiedIndex,
  dragOverInstructionIndex,
  hasReplacementMatch,
  matchedReplacementRules,
  renderedCommand,
  onStartEdit,
  onEditDescriptionChange,
  onEditCommandChange,
  onCancelEdit,
  onSaveEdit,
  onCopy,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: InstructionCardProps) {
  const isEditing = editingIndex === index;
  const editCommandLineCount = editCommand.split(/\r\n|\r|\n/).length;

  const editCommandRows = Math.min(
    10,
    Math.max(4, editCommandLineCount)
  );

  return (
    <Card
      onDragOver={(event) => onDragOver(event, index)}
      onDrop={(event) => onDrop(event, index)}
      sx={{
        mb: 2,
        border: "2px solid",
        borderColor:
          dragOverInstructionIndex === index
            ? "primary.main"
            : hasReplacementMatch
              ? "primary.main"
              : "transparent",
        boxShadow:
          hasReplacementMatch || dragOverInstructionIndex === index
            ? 6
            : undefined,
      }}
    >
      <CardContent>
        {(item.description || isEditing) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            {isEditing ? (
              <TextField
                fullWidth
                size="small"
                label="Пояснення"
                placeholder="Можна залишити порожнім"
                value={editDescription}
                onChange={(event) => onEditDescriptionChange(event.target.value)}
              />
            ) : (
              <Typography
                sx={{ color: "text.secondary", flexGrow: 1, cursor: "text" }}
                onDoubleClick={() => onStartEdit(index, item)}
              >
                // {item.description}
              </Typography>
            )}

            {matchedReplacementRules.map((rule, ruleIndex) => (
              <Chip
                key={rule.id}
                size="small"
                variant="outlined"
                label={`Заміна ${ruleIndex + 1}`}
                sx={{
                  borderColor: rule.color,
                  color: rule.color,
                }}
              />
            ))}
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
              lastCopiedIndex === index ? "primary.main" : "transparent",
            transition: "background-color 0.2s ease, border-color 0.2s ease",
          }}
        >
          <IconButton
            size="small"
            draggable={!isEditing}
            onDragStart={(event) => onDragStart(event, index)}
            onDragEnd={onDragEnd}
            title="Перетягнути команду"
            sx={{
              cursor: isEditing ? "default" : "grab",
              mt: "2px",
              color: "text.secondary",
              "&:hover": {
                color: "primary.main",
              },
              "&:active": {
                cursor: "grabbing",
              },
            }}
            disabled={isEditing}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>

          {isEditing ? (
            <Box
              sx={{
                width: "100%",
                minWidth: 0,
                border: "2px solid",
                borderColor: "primary.main",
                borderRadius: 1.5,
                overflow: "hidden",
                bgcolor: "transparent",
                p: 0.75,
                "&:focus-within": {
                  boxShadow: "0 0 0 1px rgba(242, 140, 40, 0.25)",
                },
              }}
            >
              <Box
                component="textarea"
                rows={editCommandRows}
                value={editCommand}
                onChange={(event) => onEditCommandChange(event.target.value)}
                wrap="off"
                spellCheck={false}
                sx={{
                  width: "100%",
                  minWidth: 0,
                  resize: "none",
                  display: "block",
                  boxSizing: "border-box",

                  px: 1,
                  py: 0.75,

                  border: "none",
                  outline: "none",
                  bgcolor: "transparent",
                  color: "text.primary",

                  fontFamily: "Consolas, monospace",
                  fontSize: "0.92rem",
                  lineHeight: 1.5,

                  whiteSpace: "pre",
                  overflowX: "auto",
                  overflowY: editCommandLineCount > 10 ? "auto" : "hidden",

                  scrollbarWidth: "thin",

                  "&::-webkit-scrollbar": {
                    width: "10px",
                    height: "10px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "text.disabled",
                    borderRadius: "10px",
                  },
                  "&::-webkit-scrollbar-corner": {
                    background: "transparent",
                  },
                }}
              />
            </Box>
          ) : (
            <Typography
              component="pre"
              onContextMenu={(event) => {
                event.preventDefault();
                onStartEdit(index, item);
              }}
              sx={{
                flexGrow: 1,
                m: 0,
                fontFamily: "Consolas, monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                cursor: "text",
              }}
            >
              {renderedCommand}
            </Typography>
          )}

          <IconButton color="primary" onClick={onCopy}>
            <ContentCopyIcon />
          </IconButton>

          <IconButton color="error" onClick={onDelete}>
            <DeleteIcon />
          </IconButton>
        </Box>

        {isEditing && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={onCancelEdit}
            >
              Скасувати
            </Button>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!editCommand.trim()}
              onClick={onSaveEdit}
            >
              Зберегти
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}