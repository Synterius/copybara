import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";

import FolderOpenIcon from "@mui/icons-material/FolderOpen";

type WorkspaceStateViewProps = {
  type: "loading" | "no-workspace" | "no-files";
  onOpenWorkspaceFolder: () => void;
};

export default function WorkspaceStateView({
  type,
  onOpenWorkspaceFolder,
}: WorkspaceStateViewProps) {
  if (type === "loading") {
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress color="primary" sx={{ mb: 2 }} />

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Завантаження директорії...
          </Typography>

          <Typography color="text.secondary">
            Copybara сканує папки та читає .txt файли. Це може зайняти трохи часу.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (type === "no-workspace") {
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Виберіть папку для роботи
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Copybara покаже тут .txt файли з вибраної папки.
          </Typography>

          <Button
            variant="contained"
            startIcon={<FolderOpenIcon />}
            onClick={onOpenWorkspaceFolder}
          >
            Відкрити папку
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent sx={{ textAlign: "center", py: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          У вибраній папці немає .txt файлів
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Виберіть іншу папку або додайте .txt файл у поточну.
        </Typography>

        <Button
          variant="outlined"
          startIcon={<FolderOpenIcon />}
          onClick={onOpenWorkspaceFolder}
        >
          Вибрати іншу папку
        </Button>
      </CardContent>
    </Card>
  );
}