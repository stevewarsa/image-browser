"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = require("path");
var url = require("url");
var fs = require("fs");
var win;
electron_1.app.on("ready", createWindow);
electron_1.app.on("activate", function () {
    if (win === null) {
        createWindow();
    }
});
function createWindow() {
    win = new electron_1.BrowserWindow({ width: 1200, height: 900 });
    win.loadURL(url.format({
        pathname: path.join(__dirname, "/../../dist/image-browser/index.html"),
        protocol: "file:",
        slashes: true
    }));
    win.webContents.openDevTools();
    win.maximize();
    win.on("closed", function () {
        win = null;
    });
}
electron_1.ipcMain.on("getFiles", function (event, arg) {
    var files = [];
    getFiles(arg, files);
    win.webContents.send("getFilesResponse", files);
});
function getFiles(path, filesArrayToFill) {
    console.log("Getting files for path: " + path + "...");
    fs.readdirSync(path).forEach(function (file) {
        var subpath = path + '/' + file;
        if (fs.lstatSync(subpath).isDirectory()) {
            getFiles(subpath, filesArrayToFill);
        }
        else {
            filesArrayToFill.push(path + '/' + file);
        }
    });
}
//# sourceMappingURL=main.js.map