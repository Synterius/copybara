import { Box, IconButton, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@mui/icons-material/Tune";

type ReplacementPanelProps = {
    replaceFrom: string;
    replaceTo: string;
    rulesCount: number;
    onReplaceFromChange: (value: string) => void;
    onReplaceToChange: (value: string) => void;
    onClear: () => void;
    onOpenRulesDialog: () => void;
};

export default function ReplacementPanel({
    replaceFrom,
    replaceTo,
    rulesCount,
    onReplaceFromChange,
    onReplaceToChange,
    onClear,
    onOpenRulesDialog,
}: ReplacementPanelProps) {
    return (
        <Box
            sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                width: "100%",
                pt: 1,
            }}
        >
            <IconButton
                size="small"
                color="primary"
                onClick={onOpenRulesDialog}
                title={
                    rulesCount === 1
                        ? "Додати ще одну заміну"
                        : "Керувати списком замін"
                }
                sx={{
                    width: 34,
                    height: 34,
                    border: "1px solid",
                    borderColor: "primary.main",
                    borderRadius: 1.25,
                    flexShrink: 0,
                }}
            >
                {rulesCount === 1 ? (
                    <AddIcon fontSize="small" />
                ) : (
                    <TuneIcon fontSize="small" />
                )}
            </IconButton>

            <TextField
                fullWidth
                size="small"
                label="Що замінити"
                placeholder="Наприклад: XXX"
                value={replaceFrom}
                onChange={(event) => onReplaceFromChange(event.target.value)}
            />

            <TextField
                fullWidth
                size="small"
                label="На що замінити"
                placeholder="Наприклад: signal-bridge"
                value={replaceTo}
                onChange={(event) => onReplaceToChange(event.target.value)}
            />

            <IconButton
                onClick={onClear}
                title="Очистити заміну"
                disabled={!replaceFrom && !replaceTo}
            >
                <ClearIcon />
            </IconButton>
        </Box>
    );
}