/*
  Preload que actua com a pont entre el context segur de la finestra d’Electron
  i el codi web. Exposa funcions específiques de manera segura.
*/

const { contextBridge, ipcRenderer } = require('electron');

// Exposem una API “electronAPI” segura dins del renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Permet tancar la finestra des del codi del renderer (sketch.js)
  closeWindow: () => ipcRenderer.send('close-main-window')
});
