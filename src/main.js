import path from 'path';
import url from 'url';

import { BrowserWindow, app } from 'electron';
import { enableLiveReload } from 'electron-compile';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';

import Core from './electron/Core';

const reactServerUrl = process.env.REACT_SERVER_URL;

const isDevMode = /[\\/]electron/.test(process.execPath);

if (isDevMode) {
  enableLiveReload();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let core;

const startCore = () => {
  core = new Core();
};

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 1920, height: 1080 });

  mainWindow.loadURL(
    reactServerUrl ||
      url.format({
        pathname: path.join(__dirname, '..', 'build', 'index.html'),
        protocol: 'file:',
        slashes: true,
      }),
  );

  // Open the DevTools.
  if (isDevMode) {
    await installExtension(REACT_DEVELOPER_TOOLS);
    mainWindow.webContents.openDevTools();
  }

  core.send(Core.METHODS.NEW_VIEW, {
    filePath: path.join(__dirname, '..', 'src', 'main.js'),
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

const startApp = () => {
  if (!core) {
    startCore();
  }

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!mainWindow) {
    createWindow();
  }
};

const quitApp = async () => {
  console.log('[Main] Shutting down...');

  await core.quit();

  core = null;

  console.log('[Main] Exiting');

  app.quit();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', startApp);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    quitApp();
  }
});

// On OS X it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
app.on('activate', startApp);

app.on('quit', quitApp);

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
