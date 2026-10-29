const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const appRoot = path.resolve(__dirname, '..');
const distPath = path.join(appRoot, 'dist');
const appIcon = path.join(appRoot, 'assets', 'icon.png');

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f172a',
    icon: appIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const indexPath = path.join(distPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath);
  } else {
    win.loadURL('https://example.com');
  }

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
