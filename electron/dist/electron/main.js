"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var exif_1 = require("exif");
var path = require("path");
var url = require("url");
var fs = require("fs");
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
        pathname: path.join(__dirname, "/../../../dist/image-browser/index.html"),
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
electron_1.ipcMain.on("getImageDetails", function (event, arg) {
    //console.log('getImageDetails: file='+ arg);
    try {
        new exif_1.ExifImage({ image: arg }, function (error, exifData) {
            if (error) {
                //console.log('Error: '+ error.message);
            }
            else {
                //console.log(exifData); // Do something with your data!
                console.log("getImageDetails - sending exif data for image " + arg);
                win.webContents.send("getImageDetailsResponse", exifData);
            }
        });
    }
    catch (e) {
        //console.log('Error: ' + e.message);
    }
});
electron_1.ipcMain.on("getImageDetailsSync", function (event, arg) {
    //console.log('getImageDetails: file='+ arg);
    try {
        new exif_1.ExifImage({ image: arg }, function (error, exifData) {
            if (error) {
                //console.log('Error: '+ error.message);
                event.returnValue = null;
            }
            else {
                //console.log(exifData); // Do something with your data!
                console.log("getImageDetails - sending exif data for image " + arg);
                //win.webContents.send("getImageDetailsSyncResponse", exifData);
                event.returnValue = exifData;
            }
        });
    }
    catch (e) {
        //console.log('Error: ' + e.message);
    }
});
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
electron_1.ipcMain.on("copyImageToClipboard", function (event, imagePath) {
    console.log("Attempting to copy image " + imagePath + " to clipboard...");
    var image = electron_1.nativeImage.createFromPath(imagePath);
    console.log("The following is the native image created from path:");
    console.log(image);
    console.log("Now writing image to clipboard...");
    electron_1.clipboard.writeImage(image);
    console.log("Image has been written to clipboard");
    win.webContents.send("copyImageToClipboardResponse", "Image successfully copied!");
});
electron_1.ipcMain.on("imageDataLookup", function (event, imagePath) {
    //console.log("Received 'imageDataLookup' message in main.ts with arg: " + imagePath + "...");
    var query = "select id, file_name, file_path from image_data where full_path = ?";
    runSqlStatement(query, [imagePath], function (results, err) {
        //console.log("imageDataLookup-Run SQL Statement Callback with results: ");
        //console.log(results);
        if (results) {
            var imageData = null;
            for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
                var row = results_1[_i];
                imageData = new image_data_1.ImageData();
                imageData.id = row['id'];
                imageData.fullPath = row['file_path'] + "/" + row['file_name'];
                imageData.fileName = row['file_name'];
                imageData.filePath = row['file_path'];
                break;
            }
            win.webContents.send("imageDataLookupResponse", imageData);
        }
        else {
            win.webContents.send("imageDataLookupResponse", "Error with query: " + err);
        }
    });
});
electron_1.ipcMain.on("getTagId", function (event, tagName) {
    //console.log("Received 'getTagId' message in main.ts with arg: " + tagName + "...");
    runSqlStatement("select id from tag where tag_nm = ?", [tagName], function (results, err) {
        //console.log("getTagId-Run SQL Statement Callback with results: ");
        //console.log(results);
        if (results) {
            var tagId = null;
            for (var _i = 0, results_2 = results; _i < results_2.length; _i++) {
                var row = results_2[_i];
                tagId = row['id'];
                break;
            }
            win.webContents.send("getTagIdResponse", tagId);
        }
        else {
            win.webContents.send("getTagIdResponse", "Error with query: " + err);
        }
    });
});
electron_1.ipcMain.on("getImageId", function (event, fullImagePath) {
    //console.log("Received 'getImageId' message in main.ts with arg: " + fullImagePath + "...");
    var query = "select id from image_data where full_path = ?";
    runSqlStatement(query, [fullImagePath], function (results, err) {
        //console.log("getImageId-Run SQL Statement Callback with results: ");
        //console.log(results);
        if (results) {
            var imageId = null;
            for (var _i = 0, results_3 = results; _i < results_3.length; _i++) {
                var row = results_3[_i];
                imageId = row['id'];
                break;
            }
            win.webContents.send("getImageIdResponse", imageId);
        }
        else {
            win.webContents.send("getImageIdResponse", "Error with query: " + err);
        }
    });
});
electron_1.ipcMain.on("saveImage", function (event, imageMetaData) {
    //console.log("Received 'saveImage' message in main.ts with arg: ");
    //console.log(imageMetaData);
    var query = "insert into image_data (full_path, file_name, file_path) values(?, ?, ?)";
    runSqlStatement(query, [imageMetaData.fullPath, imageMetaData.fileName, imageMetaData.filePath], function (results, err) {
        //console.log("saveImage-Run SQL Statement Callback with results: ");
        //console.log(results);
        if (results) {
            win.webContents.send("saveImageResponse", results.insertId);
        }
        else {
            win.webContents.send("saveImageResponse", "Error with query: " + err);
        }
    });
});
electron_1.ipcMain.on("saveTag", function (event, tagName) {
    //console.log("Received 'saveTag' message in main.ts with arg: " + tagName);
    var query = "insert into tag(tag_nm) values (?)";
    runSqlStatement(query, [tagName], function (results, err) {
        //console.log("saveTag-Run SQL Statement Callback with results: ");
        //console.log(results);
        if (results) {
            win.webContents.send("saveTagResponse", results.insertId);
        }
        else {
            win.webContents.send("saveTagResponse", "Error with query: " + err);
        }
    });
});
electron_1.ipcMain.on("saveImageTag", function (event, imageTagParam) {
    //console.log("Received 'saveImageTag' message in main.ts with arg: ");
    //console.log(imageTagParam);
    var query = "insert into image_tag(image_id, tag_id) values (?, ?)";
    runSqlStatement(query, [imageTagParam.imageId, imageTagParam.tagId], function (results, err) {
        //console.log("saveImageTag-Run SQL Statement Callback with results: ");
        //console.log(results);
        if (results) {
            win.webContents.send("saveImageTagResponse", "Image -> Tag Association saved for imageId=" + imageTagParam.imageId + ", tagId=" + imageTagParam.tagId);
        }
        else {
            win.webContents.send("saveImageTagResponse", "Error with query: " + err);
        }
    });
});
electron_1.ipcMain.on("runSqlStatement", function (event, arg) {
    //console.log("Received 'runSqlStatement' message in main.ts with args: ");
    //console.log(arg);
    var respondWith = arg.respondWith;
    runSqlStatement(arg.sql, arg.args, function (results, err) {
        // console.log("runSqlStatement-Run SQL Statement Callback with results: ");
        // console.log(results);
        if (results) {
            win.webContents.send(respondWith, results);
        }
        else {
            win.webContents.send(respondWith, "Error with query: " + err);
        }
    });
});
function runSqlStatement(sql, args, callback) {
    //console.log("function runSqlStatement in main.ts with sql: " + sql);
    //console.log("and arguments: ");
    //console.log(args);
    var results = null;
    executeDb(function (database) { return database.query(sql, args).then(function (rows) {
        results = rows;
    }); }).then(function () {
        callback(results, null);
    }).catch(function (err) {
        // handle the error
        callback(null, err);
    });
}
//# sourceMappingURL=main.js.map