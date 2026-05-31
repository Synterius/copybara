export const buildFilePath = (folderPath: string, relativePath: string) => {
  const separator =
    folderPath.includes("\\") && !folderPath.includes("/") ? "\\" : "/";

  const cleanFolderPath = folderPath.replace(/[\\/]+$/g, "");
  const cleanRelativePath = relativePath
    .replace(/^[\\/]+/g, "")
    .replace(/[\\/]/g, separator);

  return `${cleanFolderPath}${separator}${cleanRelativePath}`;
};