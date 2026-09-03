export interface ElectronAPI {
  isElectron: boolean;
  openDocxDialog: () => Promise<{
    filePath: string;
    fileName: string;
    data: number[];
  } | null>;
  saveDocxDialog: (
    bufferData: number[],
    defaultName?: string
  ) => Promise<{ success: boolean; filePath?: string; fileName?: string; canceled?: boolean }>;
  saveDocxDirect: (
    targetPath: string,
    bufferData: number[]
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  readDocxFile: (
    targetPath: string
  ) => Promise<{ success: boolean; filePath?: string; fileName?: string; data?: number[]; error?: string }>;
  getSecureKey: (key: string) => Promise<string | null>;
  setSecureKey: (key: string, value: string) => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
