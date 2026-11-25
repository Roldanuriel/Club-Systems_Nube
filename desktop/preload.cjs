const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('clubSystemsDesktop', Object.freeze({
  isDesktop: true,
  platform: process.platform
}));
