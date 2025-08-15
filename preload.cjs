
const { contextBridge, ipcRenderer } = require('electron');

// Set default server address
let serverAddress = 'http://localhost:5000';

// Listen for server info from main process
ipcRenderer.on('server-info', (event, serverInfo) => {
  if (serverInfo && serverInfo.port) {
    serverAddress = `http://localhost:${serverInfo.port}`;
    console.log('Server address updated:', serverAddress);
  }
});

// Expose API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  get serverAddress() {
    return serverAddress;
  },
  onServerInfo: (callback) => {
    ipcRenderer.on('server-info', callback);
  }
});

// Expose environment info
contextBridge.exposeInMainWorld('electronEnv', {
  isElectron: true,
  platform: process.platform,
  arch: process.arch
});
