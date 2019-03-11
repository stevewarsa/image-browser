import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";

let win: BrowserWindow;

app.on("ready", createWindow);

app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});

function createWindow() {
  win = new BrowserWindow({ width: 1200, height: 900 });

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, `/../../dist/image-browser/index.html`),
      protocol: "file:",
      slashes: true
    })
  );

  win.webContents.openDevTools();

  win.on("closed", () => {
    win = null;
  });
}

ipcMain.on("getFiles", (event, arg) => {
  let files: string[] = [];
  getFiles(arg, files);
  win.webContents.send("getFilesResponse", files);
});

function getFiles(path: string, filesArrayToFill: string[]) {
    console.log("Getting files for path: " + path + "...");
    fs.readdirSync(path).forEach(file => {
        var subpath = path + '/' + file;
        if (fs.lstatSync(subpath).isDirectory()){
            getFiles(subpath, filesArrayToFill);
        } else {
            filesArrayToFill.push(path + '/' + file);
        }
    });
}