import { app, BrowserWindow, ipcMain, nativeImage, clipboard, shell } from "electron";
import { ExifImage } from "exif"
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
import { Database } from "./database";
import { ImageData } from './../src/app/image-data';

let win: BrowserWindow;

let executeDb = (callback) => {
  const database = new Database();
  return callback(database).then(
      result => database.close().then(() => result),
      err => database.close().then(() => { throw err; })
  );
};

app.on("ready", createWindow);

app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});

function createWindow() {
  win = new BrowserWindow();
  win.loadURL(
    url.format({
      pathname: path.join(__dirname, `/../../../dist/image-browser/index.html`),
      protocol: "file:",
      slashes: true
    })
  );

  win.setMenu(null);

  //win.webContents.openDevTools();
  win.maximize();

  win.on("closed", () => {
    win = null;
  });
}

ipcMain.on("getImageDetailsSync", (event, arg) => {
  console.log('getImageDetails: file='+ arg);
  try {
    new ExifImage({ image : arg }, (error, exifData) => {
      if (error) {
        console.log('Error: '+ error.message);
        event.returnValue = null;
      } else {
        console.log(exifData); // Do something with your data!
        console.log("getImageDetails - sending exif data for image " + arg);
        event.returnValue = exifData;
      }
    });
  } catch (e) {
    console.log('Error caught: ' + e.message);
  }
});

ipcMain.on("openImageInApp", (event, arg) => {
  shell.openItem(arg);
  win.webContents.send("openImageInAppResponse", "Image successfully opened!");
});

ipcMain.on("deleteImage", (event, arg) => {
  if (fs.existsSync(arg)) {
    fs.unlink(arg, (err) => {
      if (err) {
        event.returnValue = "Error - An error ocurred deleting the file " + arg + ": " + err.message;
        console.log("Error - An error ocurred deleting the file " + arg + ": " + err.message);
      } else {
        console.log("File succesfully deleted");
        event.returnValue = "File " + arg + " succesfully deleted";
      }
    });
  } else {
    event.returnValue = "Error - This file (" + arg + ") doesn't exist, cannot delete";
  }
});

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

ipcMain.on("copyImageToClipboard", (event, imagePath) => {
  console.log("Attempting to copy image " + imagePath + " to clipboard...");
  let image = nativeImage.createFromPath(imagePath);
  console.log("The following is the native image created from path:");
  console.log(image);
  console.log("Now writing image to clipboard...");
  clipboard.writeImage(image);
  console.log("Image has been written to clipboard");
  win.webContents.send("copyImageToClipboardResponse", "Image successfully copied!");
});

ipcMain.on("imageDataLookup", (event, imagePath) => {
  //console.log("Received 'imageDataLookup' message in main.ts with arg: " + imagePath + "...");
  let query = "select id, file_name, file_path from image_data where full_path = ?";
  runSqlStatement(query, [imagePath], (results, err) => {
    //console.log("imageDataLookup-Run SQL Statement Callback with results: ");
    //console.log(results);
    if (results) {
      let imageData: ImageData = null;
      for (let row of results) {
        imageData = new ImageData();
        imageData.id = row['id'];
        imageData.fullPath = row['file_path'] + "/" + row['file_name'];
        imageData.fileName = row['file_name'];
        imageData.filePath = row['file_path'];
        break;
      }
      win.webContents.send("imageDataLookupResponse", imageData);
    } else {
      win.webContents.send("imageDataLookupResponse", "Error with query: " + err);
    }
  });
});

ipcMain.on("getTagId", (event, tagName) => {
  //console.log("Received 'getTagId' message in main.ts with arg: " + tagName + "...");
  runSqlStatement("select id from tag where tag_nm = ?", [tagName], (results, err) => {
    //console.log("getTagId-Run SQL Statement Callback with results: ");
    //console.log(results);
    if (results) {
      let tagId = null;
      for (let row of results) {
        tagId = row['id'];
        break;
      }
      win.webContents.send("getTagIdResponse", tagId);
    } else {
      win.webContents.send("getTagIdResponse", "Error with query: " + err);
    }
  });
});

ipcMain.on("getImageId", (event, fullImagePath) => {
  //console.log("Received 'getImageId' message in main.ts with arg: " + fullImagePath + "...");
  let query = "select id from image_data where full_path = ?";
  runSqlStatement(query, [fullImagePath], (results, err) => {
    //console.log("getImageId-Run SQL Statement Callback with results: ");
    //console.log(results);
    if (results) {
      let imageId = null;
      for (let row of results) {
        imageId = row['id'];
        break;
      }
      win.webContents.send("getImageIdResponse", imageId);
    } else {
      win.webContents.send("getImageIdResponse", "Error with query: " + err);
    }
  });
});

ipcMain.on("saveImage", (event, imageMetaData) => {
  //console.log("Received 'saveImage' message in main.ts with arg: ");
  //console.log(imageMetaData);
  let query = "insert into image_data (full_path, file_name, file_path) values(?, ?, ?)";
  runSqlStatement(query, [imageMetaData.fullPath, imageMetaData.fileName, imageMetaData.filePath], (results, err) => {
    //console.log("saveImage-Run SQL Statement Callback with results: ");
    //console.log(results);
    if (results) {
      win.webContents.send("saveImageResponse", results.insertId);
    } else {
      win.webContents.send("saveImageResponse", "Error with query: " + err);
    }
  });
});

ipcMain.on("saveTag", (event, tagName) => {
  //console.log("Received 'saveTag' message in main.ts with arg: " + tagName);
  let query = "insert into tag(tag_nm) values (?)";
  runSqlStatement(query, [tagName], (results, err) => {
    //console.log("saveTag-Run SQL Statement Callback with results: ");
    //console.log(results);
    if (results) {
      win.webContents.send("saveTagResponse", results.insertId);
    } else {
      win.webContents.send("saveTagResponse", "Error with query: " + err);
    }
  });
});

ipcMain.on("saveImageTag", (event, imageTagParam) => {
  //console.log("Received 'saveImageTag' message in main.ts with arg: ");
  //console.log(imageTagParam);
  let query = "insert into image_tag(image_id, tag_id) values (?, ?)";
  runSqlStatement(query, [imageTagParam.imageId, imageTagParam.tagId], (results, err) => {
    //console.log("saveImageTag-Run SQL Statement Callback with results: ");
    //console.log(results);
    if (results) {
      win.webContents.send("saveImageTagResponse", "Image -> Tag Association saved for imageId=" + imageTagParam.imageId + ", tagId=" + imageTagParam.tagId);
    } else {
      win.webContents.send("saveImageTagResponse", "Error with query: " + err);
    }
  });
});

ipcMain.on("runSqlStatement", (event, arg) => {
  //console.log("Received 'runSqlStatement' message in main.ts with args: ");
  //console.log(arg);
  let respondWith: string = arg.respondWith;
  runSqlStatement(arg.sql, arg.args, (results, err) => {
    // console.log("runSqlStatement-Run SQL Statement Callback with results: ");
    // console.log(results);
    if (results) {
      win.webContents.send(respondWith, results);
    } else {
      win.webContents.send(respondWith, "Error with query: " + err);
    }
  });
});

ipcMain.on("runSqlStatementSync", (event, arg) => {
  console.log("Received 'runSqlStatementSync' message in main.ts with args: ");
  console.log(arg);
  runSqlStatement(arg.sql, arg.args, (results, err) => {
    console.log("runSqlStatementSync-Run SQL Statement Callback with results: ");
    console.log(results);
    if (results) {
      event.returnValue = results;
    } else {
      event.returnValue = "Error with query: " + err;
    }
  });
});

function runSqlStatement(sql: string, args:string[], callback) {
  //console.log("function runSqlStatement in main.ts with sql: " + sql);
  //console.log("and arguments: ");
  //console.log(args);
  let results = null;
  executeDb(database => database.query(sql, args).then(rows => {
      results = rows;
    })
  ).then(() => {
    callback(results, null);
  }).catch( err => {
    // handle the error
    callback(null, err);
  });
}
