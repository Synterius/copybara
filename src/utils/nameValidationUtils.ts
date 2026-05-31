export const validateNodeName = (rawName: string): string | null => {
  const name = rawName.trim();

  if (!name) {
    return "Вкажіть назву";
  }

  if (name === "." || name === "..") {
    return "Некоректна назва";
  }

  if (name.includes("/") || name.includes("\\")) {
    return "Назва не повинна містити шлях або вкладені папки";
  }

  if (name.includes("..")) {
    return "Назва не повинна містити '..'";
  }

  const forbiddenChars = /[<>:"|?*]/;

  if (forbiddenChars.test(name)) {
    return "Назва містить заборонені символи";
  }

  return null;
};

export const validateNewFileName = (rawName: string): string | null => {
  const baseError = validateNodeName(rawName);

  if (baseError) {
    return baseError;
  }

  const name = rawName.trim();

  const nameWithoutExtension = name.toLowerCase().endsWith(".txt")
    ? name.slice(0, -4).trim()
    : name;

  if (!nameWithoutExtension) {
    return "Назва файлу не може складатися лише з .txt";
  }

  return null;
};