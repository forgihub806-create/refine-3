import { app, BrowserWindow } from 'electron';
console.log('NODE_ENV:', process.env.NODE_ENV);
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess = null;
let serverInfo = { port: 5000 }; // Define serverInfo with default port

const startServer = () => {
  return new Promise((resolve, reject) => {
    const npmPath = process.platform === 'win32'
      ? 'C:\\Program Files\\nodejs\\npm.cmd'
      : 'npm';
    serverProcess = spawn(npmPath, ['run', 'dev:server'], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    let serverStarted = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Server:', output);

      // Look for server startup confirmation
      if ((output.includes('Server running on') || output.includes('listening on') || output.includes('started at')) && !serverStarted) {
        serverStarted = true;
        // Extract port if mentioned in output
        const portMatch = output.match(/:(\d+)/);
        if (portMatch) {
          serverInfo.port = parseInt(portMatch[1]);
        }
        console.log('Server detected as started, port:', serverInfo.port);
        resolve(serverInfo);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server Error:', data.toString());
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server process:', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && !serverStarted) {
        reject(new Error(`Server process exited with code ${code}`));
      }
    });

    // Fallback timeout
    setTimeout(() => {
      if (!serverStarted) {
        resolve(serverInfo); // Resolve with default port
      }
    }, 10000);
  });
};

async function createWindow() {
  // Start server first
  try {
    // In production, start the server from here.
    // In development, the server is started by `concurrently` in `npm run dev`.
    if (process.env.NODE_ENV !== 'development') {
      await startServer();
      console.log('Server started successfully on port:', serverInfo.port);
    } else {
      console.log('Development mode: server is managed externally.');
    }

    // Wait for server to be ready
    await healthCheck(serverInfo.port);
  } catch (error) {
    console.error('Failed to start server:', error);
    // Continue anyway with default port
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading from localhost
    },
    icon: path.join(__dirname, 'attached_assets', 'image_1755143284120.png'), // App icon
    show: false // Don't show until ready
  });

  // Send server info to renderer process
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('server-info', serverInfo);
    win.show(); // Show window after content loads
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(`http://localhost:${serverInfo.port}`);
    win.webContents.openDevTools();
  } else {
    // Use file:// URL to ensure relative assets load correctly
    win.loadURL(`file://${path.join(__dirname, 'dist', 'public', 'index.html')}`);
  }

  return win;
}

async function healthCheck(port) {
  console.log(`Starting health check for port ${port}`);
  for (let i = 0; i < 30; i++) { // Increased attempts
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok && response.status === 200) {
        const data = await response.json();
        if (data && (data.status === 'ok' || data.status === 'OK')) {
          console.log('Health check passed:', data);
          return;
        } else {
          throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
        }
      } else {
        console.log(`Health check attempt ${i + 1}: Server responded with status ${response.status}`);
      }
    } catch (e) {
      console.log(`Health check attempt ${i + 1} failed:`, e.message || e.code || e);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.warn('Health check failed after 30 attempts, continuing anyway');
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error('Failed to create window:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', (event) => {
  if (serverProcess) {
    event.preventDefault();
    console.log('Stopping server...');

    serverProcess.kill('SIGTERM');

    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      app.exit();
    }, 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});