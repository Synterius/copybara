import {
  Box,
  IconButton,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import FindReplaceIcon from "@mui/icons-material/FindReplace";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

import ReplacementPanel from "./ReplacementPanel";

type CurrentFileHeaderProps = {
  selectedFileName: string | null;
  workspacePath: string | null;
  filteredInstructionsCount: number;
  instructionsCount: number;

  replacementVisible: boolean;
  minimizeAfterCopy: boolean;

  replaceFrom: string;
  replaceTo: string;
  replacementRulesCount: number;

  onAddCommand: () => void;
  onReloadCurrentFile: () => void;
  onShowInTree: () => void;
  onToggleReplacementVisible: () => void;
  onToggleMinimizeAfterCopy: () => void;

  onReplaceFromChange: (value: string) => void;
  onReplaceToChange: (value: string) => void;
  onClearReplacement: () => void;
  onOpenReplacementRulesDialog: () => void;
};

export default function CurrentFileHeader({
  selectedFileName,
  workspacePath,
  filteredInstructionsCount,
  instructionsCount,
  replacementVisible,
  minimizeAfterCopy,
  replaceFrom,
  replaceTo,
  replacementRulesCount,
  onAddCommand,
  onReloadCurrentFile,
  onShowInTree,
  onToggleReplacementVisible,
  onToggleMinimizeAfterCopy,
  onReplaceFromChange,
  onReplaceToChange,
  onClearReplacement,
  onOpenReplacementRulesDialog,
}: CurrentFileHeaderProps) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        mb: 2,
        py: 1.5,
        backgroundColor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {selectedFileName}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {workspacePath ?? "Папку ще не вибрано"}
            </Typography>

            <IconButton
              size="small"
              color="primary"
              onClick={onShowInTree}
              title="Показати в дереві"
              disabled={!workspacePath || !selectedFileName}
              sx={{ p: 0.25 }}
            >
              <AccountTreeIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Команд: {filteredInstructionsCount} / {instructionsCount}
          </Typography>
        </Box>

        <IconButton
          color="primary"
          onClick={onAddCommand}
          title="Додати команду"
          disabled={!workspacePath || !selectedFileName}
        >
          <AddIcon />
        </IconButton>

        <IconButton
          color="primary"
          onClick={onReloadCurrentFile}
          title="Перечитати файл"
          disabled={!workspacePath || !selectedFileName}
        >
          <RefreshIcon />
        </IconButton>

        <IconButton
          color={replacementVisible ? "primary" : "default"}
          onClick={onToggleReplacementVisible}
          title="Заміна тексту"
          disabled={!workspacePath || !selectedFileName}
        >
          <FindReplaceIcon />
        </IconButton>

        <IconButton
          color={minimizeAfterCopy ? "primary" : "default"}
          onClick={onToggleMinimizeAfterCopy}
          title={
            minimizeAfterCopy
              ? "Згортання після копіювання увімкнено"
              : "Згортати після копіювання"
          }
          disabled={!workspacePath || !selectedFileName}
        >
          <BrandingWatermarkIcon />
        </IconButton>
      </Box>

      {replacementVisible && (
        <ReplacementPanel
          replaceFrom={replaceFrom}
          replaceTo={replaceTo}
          rulesCount={replacementRulesCount}
          onReplaceFromChange={onReplaceFromChange}
          onReplaceToChange={onReplaceToChange}
          onClear={onClearReplacement}
          onOpenRulesDialog={onOpenReplacementRulesDialog}
        />
      )}
    </Box>
  );
}