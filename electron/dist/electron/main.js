"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var image_data_1 = require("./../src/app/image-data");
var electron_1 = require("electron");
var path = require("path");
var url = require("url");
var fs = require("fs");
var mysql = require("mysql");
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
electron_1.ipcMain.on("copyImageToClipboard", function (event, arg) {
    copyImageToClipboard(arg);
    win.webContents.send("copyImageToClipboardResponse", "Image successfully copied!");
});
electron_1.ipcMain.on("openImageInApp", function (event, arg) {
    electron_1.shell.openItem(arg);
    win.webContents.send("openImageInAppResponse", "Image successfully opened!");
});
electron_1.ipcMain.on("getImageMetaData", function (event, arg) {
    console.log("Received 'getImageMetaData' message in main.ts with arg: " + arg + "...");
    win.webContents.send("getImageMetaDataResponse", getImageMetaData(arg));
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
function copyImageToClipboard(imagePath) {
    console.log("Attempting to copy image " + imagePath + " to clipboard...");
    var image = electron_1.nativeImage.createFromPath(imagePath);
    console.log("The following is the native image created from path:");
    console.log(image);
    console.log("Now writing image to clipboard...");
    electron_1.clipboard.writeImage(image);
    console.log("Image has been written to clipboard");
}
function getImageMetaData(imagePath) {
    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'devuser',
        password: 'Galatians2v20',
        database: 'image-meta-data'
    });
    // connect to mysql
    connection.connect(function (err) {
        // in case of error
        if (err) {
            console.log(err.code);
            console.log(err.fatal);
        }
    });
    // Perform a query
    var query = "select id, file_name, file_path from image_data where full_path = ?";
    var imageData = new image_data_1.ImageData();
    connection.query(query, [imagePath], function (err, rows, fields) {
        if (err) {
            console.log("An error ocurred performing the query.");
            console.log(err);
            return;
        }
        console.log("Query succesfully executed here are the values:");
        console.log(rows);
        console.log("Here are the fields:");
        console.log(fields);
    });
    // Close the connection
    connection.end(function () {
        // The connection has been closed
    });
    return imageData;
}
//# sourceMappingURL=main.js.map