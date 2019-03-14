import { app, BrowserWindow, ipcMain, nativeImage, clipboard, shell } from "electron";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
import * as mysql from "mysql";

let win: BrowserWindow;

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
      pathname: path.join(__dirname, `/../../dist/image-browser/index.html`),
      protocol: "file:",
      slashes: true
    })
  );

  win.setMenu(null);

  win.webContents.openDevTools();
  win.maximize();

  win.on("closed", () => {
    win = null;
  });
}

ipcMain.on("openImageInApp", (event, arg) => {
  shell.openItem(arg);
  win.webContents.send("openImageInAppResponse", "Image successfully opened!");
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

ipcMain.on("copyImageToClipboard", (event, arg) => {
  copyImageToClipboard(arg);
  win.webContents.send("copyImageToClipboardResponse", "Image successfully copied!");
});

function copyImageToClipboard(imagePath: string) {
  console.log("Attempting to copy image " + imagePath + " to clipboard...");
  let image = nativeImage.createFromPath(imagePath);
  console.log("The following is the native image created from path:");
  console.log(image);
  console.log("Now writing image to clipboard...");
  clipboard.writeImage(image);
  console.log("Image has been written to clipboard");
}

ipcMain.on("imageDataLookup", (event, arg) => {
  getImageMetaData(arg);
});

function getImageMetaDataCallBack(err, rows) {
  if (err) {
    win.webContents.send("imageDataLookupResponse", "Error with query: " + err);
  } else {
    let imageData = null;
    for (let row of rows) {
      console.log(row['id']);
      console.log(row['file_path']);
      console.log(row['file_name']);
      imageData = {
        id: row['id'],
        fullPath: row['file_path'] + row['file_name'],
        fileName: row['file_name'],
        filePath: row['file_path']
      };
      break;
    }
    win.webContents.send("imageDataLookupResponse", imageData);
  }
}

function getImageMetaData(imagePath) {
  console.log("Received 'imageDataLookup' message in main.ts with arg: " + imagePath + "...");
  let connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'devuser',
    password : 'Galatians2v20',
    database : 'image-meta-data'
  });
  // connect to mysql
  connection.connect(err => {
    // in case of error
    if (err) {
      console.log(err.code);
      console.log(err.fatal);
    }
  });
  // Perform a query
  let query = "select id, file_name, file_path from image_data where full_path = ?";
  connection.query(query, [imagePath], (err, rows, fields) => {
    if (err) {
        console.log("An error ocurred performing the query.");
        console.log(err);
        getImageMetaDataCallBack(err, null);
    } else {
      getImageMetaDataCallBack(null, rows);
    }

    // console.log("Here are the fields:");
    // console.log(fields);
  });
  // Close the connection
  connection.end(() => {
    // The connection has been closed
  });
}

ipcMain.on("addTagToImage", (event, arg) => {
  // the arg is expected to contain the full image path and the tag name
  // if the tag name does not exist, then a new tag will be added
  win.webContents.send("addTagToImageResponse", addTagToImage(arg));
});

function addTagToImage(tagParam: any) {
  console.log(tagParam);
}