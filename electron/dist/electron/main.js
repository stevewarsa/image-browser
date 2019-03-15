"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = require("path");
var url = require("url");
var fs = require("fs");
var mysql = require("mysql");
var database_1 = require("./database");
var image_data_1 = require("./../src/app/image-data");
var win;
var executeDb = function (callback) {
    var database = new database_1.Database();
    return callback(database).then(function (result) { return database.close().then(function () { return result; }); }, function (err) { return database.close().then(function () { throw err; }); });
};
electron_1.app.on("ready", createWindow);
electron_1.app.on("activate", function () {
    if (win === null) {
        createWindow();
    }
});
function createWindow() {
    win = new electron_1.BrowserWindow();
    win.loadURL(url.format({
        pathname: path.join(__dirname, "/../../dist/image-browser/index.html"),
        protocol: "file:",
        slashes: true
    }));
    win.setMenu(null);
    win.webContents.openDevTools();
    win.maximize();
    win.on("closed", function () {
        win = null;
    });
}
electron_1.ipcMain.on("openImageInApp", function (event, arg) {
    electron_1.shell.openItem(arg);
    win.webContents.send("openImageInAppResponse", "Image successfully opened!");
});
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
electron_1.ipcMain.on("copyImageToClipboard", function (event, arg) {
    copyImageToClipboard(arg);
    win.webContents.send("copyImageToClipboardResponse", "Image successfully copied!");
});
function copyImageToClipboard(imagePath) {
    console.log("Attempting to copy image " + imagePath + " to clipboard...");
    var image = electron_1.nativeImage.createFromPath(imagePath);
    console.log("The following is the native image created from path:");
    console.log(image);
    console.log("Now writing image to clipboard...");
    electron_1.clipboard.writeImage(image);
    console.log("Image has been written to clipboard");
}
electron_1.ipcMain.on("imageDataLookup", function (event, arg) {
    getImageMetaData(arg);
});
function getImageMetaData(imagePath) {
    console.log("Received 'imageDataLookup' message in main.ts with arg: " + imagePath + "...");
    var someRows = [];
    var query = "select id, file_name, file_path from image_data where full_path = ?";
    executeDb(function (database) { return database.query(query, [imagePath]).then(function (rows) { return someRows; }); }).then(function () {
        // do something with someRows and otherRows
        var imageData = null;
        for (var _i = 0, someRows_1 = someRows; _i < someRows_1.length; _i++) {
            var row = someRows_1[_i];
            console.log(row['id']);
            console.log(row['file_path']);
            console.log(row['file_name']);
            imageData = new image_data_1.ImageData();
            imageData.id = row['id'];
            imageData.fullPath = row['file_path'] + row['file_name'];
            imageData.fileName = row['file_name'];
            imageData.filePath = row['file_path'];
            break;
        }
        win.webContents.send("imageDataLookupResponse", imageData);
    }).catch(function (err) {
        // handle the error
        win.webContents.send("imageDataLookupResponse", "Error with query: " + err);
    });
}
electron_1.ipcMain.on("addTagToImage", function (event, arg) {
    // the arg is expected to contain the full image path and the tag name
    // if the tag name does not exist, then a new tag will be added
    win.webContents.send("addTagToImageResponse", addTagToImage(arg));
});
function addTagToImage(tagParam) {
    // console.log(tagParam);
    // let tag: string = tagParam.tag;
    // runQuery("select id from tag where tag_nm = ?", [tag], (err, rows) => {
    // });
    // let imagePath: string = tagParam.img;
    // let connection = getConnection();
    // let query = "insert into ";
    // connection.query(query, [imagePath], (err, rows, fields) => {
    //   if (err) {
    //     console.log("An error ocurred performing the query.");
    //     console.log(err);
    //     getImageMetaDataCallBack(err, null);
    //   } else {
    //     getImageMetaDataCallBack(null, rows);
    //   }
    // });
    // connection.end(() => {});
}
function getConnection() {
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
    return connection;
}
function runQuery(sqlSelectStmt, args, callBack) {
    var connection = getConnection();
    connection.query(sqlSelectStmt, args, function (err, rows, fields) {
        if (err) {
            console.log("An error ocurred performing the query " + sqlSelectStmt + ":");
            console.log(err);
            callBack(err, null);
        }
        else {
            callBack(null, rows);
        }
    });
    connection.end(function () { });
}
//# sourceMappingURL=main.js.map