export {};

declare global {
  interface Window {
    electronAPI: {
      serverAddress: string;
      onServerInfo: (callback: (event: any, serverInfo: any) => void) => void;
    };
    electronEnv: {
      isElectron: boolean;
      platform: string;
      arch: string;
    };
  }
}
