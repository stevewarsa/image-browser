"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
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
    addTagToImage(arg);
});
function addTagToImage(tagParam) {
    console.log("main.addTagToImage starting...");
    var tag = tagParam.tag;
    var imageFullPath = tagParam.fullPath;
    var imageFileName = tagParam.fileName;
    var imageFilePath = tagParam.filePath;
    var imageQuery = "select id from image_data where full_path = ?";
    var imageInsert = "insert into image_data (full_path, file_name, file_path) values(?, ?, ?)";
    var tagQuery = "select id from tag where tag_nm = ?";
    var tagInsert = "insert into tag (tag_nm) values(?)";
    var imageTagInsert = "insert into image_tag (image_id, tag_id) values(?,?)";
    var tagId = null;
    var imageId = null;
    var lastQueryRan = tagQuery;
    var chainNo = 0;
    console.log("Chain " + chainNo + ": Running tag query for tag '" + tag + "'...");
    executeDb(function (database) { return database.query(tagQuery, [tag])
        .then(function (rows) {
        chainNo += 1;
        if (!rows || rows.length === 0) {
            console.log("Chain " + chainNo + ": No results returned for tag '" + tag + "'.  Running tag insert...");
            lastQueryRan = tagInsert;
            return database.query(tagInsert, [tag]);
        }
        else {
            tagId = rows[0]['id'];
            console.log("Chain " + chainNo + ": Tag id '" + tagId + " was found for tag '" + tag + "'.  Running image query...");
            lastQueryRan = imageQuery;
            return database.query(imageQuery, [imageFullPath]);
        }
    })
        .then(function (rows) {
        chainNo += 1;
        console.log("Chain " + chainNo + ": Last query ran was '" + lastQueryRan + "'...");
        if (lastQueryRan === imageQuery) {
            // that means rows contains the imageQuery results
            if (!rows || rows.length === 0) {
                lastQueryRan = imageInsert;
                console.log("Chain " + chainNo + ": No results returned for image '" + imageFullPath + "'.  Running image insert...");
                return database.query(imageInsert, [imageFullPath, imageFileName, imageFilePath]);
            }
            else {
                // an image was found, and there is a tagId, so run the imageTagInsert
                imageId = rows[0]['id'];
                lastQueryRan = imageTagInsert;
                console.log("Chain " + chainNo + ": Image id '" + imageId + " was found for image '" + imageFullPath + "'.  Running imageTag insert...");
                return database.query(imageTagInsert, [imageId, tagId]);
            }
        }
        else if (lastQueryRan === tagInsert) {
            // this means rows contains the tagInsert results
            tagId = rows.insertId;
            console.log("Chain " + chainNo + ": New tag inserted with id '" + tagId + " now running query for image '" + imageFullPath + "'...");
            // therefore, we need to now run the imageQuery
            lastQueryRan = imageQuery;
            return database.query(imageQuery, [imageFullPath]);
        }
    })
        .then(function (rows) {
        chainNo += 1;
        console.log("Chain " + chainNo + ": Last query ran was '" + lastQueryRan + "'...");
        switch (lastQueryRan) {
            case imageQuery:
                // that means rows contains the imageQuery results
                if (!rows || rows.length === 0) {
                    lastQueryRan = imageInsert;
                    console.log("Chain " + chainNo + ": No results returned for image '" + imageFullPath + "'.  Running image insert...");
                    return database.query(imageInsert, [imageFullPath, imageFileName, imageFilePath]);
                }
                else {
                    // an image was found, and there is a tagId, so run the imageTagInsert
                    imageId = rows[0]['id'];
                    lastQueryRan = imageTagInsert;
                    console.log("Chain " + chainNo + ": Image id '" + imageId + " was found for image '" + imageFullPath + "'.  Running imageTag insert...");
                    return database.query(imageTagInsert, [imageId, tagId]);
                }
            case imageInsert:
                imageId = rows.insertId;
                console.log("Chain " + chainNo + ": New image inserted with id '" + imageId + " now running insert for imageTag with tagId '" + tagId + "'...");
                lastQueryRan = imageTagInsert;
                return database.query(imageTagInsert, [imageId, tagId]);
            case imageTagInsert:
                // if we're running imageTagInsert, we're done!
                console.log("Chain " + chainNo + ": ImageTag record inserted with imageId '" + imageId + " and tagId '" + tagId + "', full process complete!");
                break;
            default:
                break;
        }
    })
        .then(function (rows) {
        chainNo += 1;
        console.log("Chain " + chainNo + ": Last query ran was '" + lastQueryRan + "'...");
        switch (lastQueryRan) {
            case imageInsert:
                imageId = rows.insertId;
                lastQueryRan = imageTagInsert;
                console.log("Chain " + chainNo + ": New image inserted with id '" + imageId + " now running insert for imageTag with tagId '" + tagId + "'...");
                return database.query(imageTagInsert, [imageId, tagId]);
            case imageTagInsert:
                // if we're running imageTagInsert, we're done!
                console.log("Chain " + chainNo + ": ImageTag record inserted with imageId '" + imageId + " and tagId '" + tagId + "', full process complete!");
                break;
            default:
                break;
        }
    })
        .then(function (rows) {
        chainNo += 1;
        console.log("Chain " + chainNo + ": Last query ran was '" + lastQueryRan + "'...");
        // the assumption is that this is the final insert
        if (lastQueryRan === imageTagInsert) {
            console.log("Chain " + chainNo + ": ImageTag record inserted with imageId '" + imageId + " and tagId '" + tagId + "', full process complete!");
        }
    }); }).then(function () {
        // do something with someRows and otherRows
        win.webContents.send("addTagToImageResponse", "tag added - tagId=" + tagId + ", imageId=" + imageId);
    }).catch(function (err) {
        // handle the error
        win.webContents.send("addTagToImageResponse", "Error adding tag: " + err);
    });
}
//# sourceMappingURL=main.js.map