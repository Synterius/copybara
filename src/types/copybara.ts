export type Instruction = {
  description: string;
  command: string;
};

export type WorkspaceNode = {
  type: "folder" | "file";
  name: string;
  path: string;
  children?: WorkspaceNode[];
};

export type TreeContextMenu = {
  mouseX: number;
  mouseY: number;
  node: WorkspaceNode;
} | null;