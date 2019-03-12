import { ImageData } from './../src/app/image-data';
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
  win = new BrowserWindow({ width: 1200, height: 900 });

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, `/../../dist/image-browser/index.html`),
      protocol: "file:",
      slashes: true
    })
  );

  win.webContents.openDevTools();
  win.maximize();

  win.on("closed", () => {
    win = null;
  });
}

ipcMain.on("getFiles", (event, arg) => {
  let files: string[] = [];
  getFiles(arg, files);
  win.webContents.send("getFilesResponse", files);
});

ipcMain.on("copyImageToClipboard", (event, arg) => {
  copyImageToClipboard(arg);
  win.webContents.send("copyImageToClipboardResponse", "Image successfully copied!");
});

ipcMain.on("openImageInApp", (event, arg) => {
  shell.openItem(arg);
  win.webContents.send("openImageInAppResponse", "Image successfully opened!");
});

ipcMain.on("getImageMetaData", (event, arg) => {
  console.log("Received 'getImageMetaData' message in main.ts with arg: " + arg + "...");
  win.webContents.send("getImageMetaDataResponse", getImageMetaData(arg));
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

function copyImageToClipboard(imagePath: string) {
  console.log("Attempting to copy image " + imagePath + " to clipboard...");
  let image = nativeImage.createFromPath(imagePath);
  console.log("The following is the native image created from path:");
  console.log(image);
  console.log("Now writing image to clipboard...");
  clipboard.writeImage(image);
  console.log("Image has been written to clipboard");
}

function getImageMetaData(imagePath: string): ImageData {
  var connection = mysql.createConnection({
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
  let imageData: ImageData = new ImageData();
  connection.query(query, [imagePath], (err, rows, fields) => {
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
  connection.end(() => {
    // The connection has been closed
  });
  return imageData;
}