/*
  Arxiu principal d'Electron.
  Controla la creació de la finestra, la càrrega de la pàgina HTML i la comunicació amb el renderer.
*/

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

// Funció que crea la finestra principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    kiosk: true,             // Mode pantalla completa
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false, // Millora la seguretat: desactiva Node al renderer
      contextIsolation: true, // Permet el preload.js
      preload: path.join(__dirname, 'preload.js') // Carrega fitxer intermedi segur
    }
  });

  // Carreguem el fitxer HTML local empaquetat amb l'aplicació
  mainWindow.loadFile('index.html');

  // Obre les DevTools automàticament en mode separar (útil per debug durant desenvolupament)
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Escolta l'esdeveniment de tancament des del renderer (sketch.js)
  ipcMain.on('close-main-window', () => {
    if (mainWindow) mainWindow.close();
  });
}

// Quan l'aplicació està llesta, es crea la finestra
app.whenReady().then(createWindow);

// Tanquem completament quan es tanquen totes les finestres
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// En macOS, recrea la finestra si no n'hi ha cap oberta i l'app continua activa
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});