import { app, BrowserWindow, ipcMain, nativeImage, clipboard, shell } from "electron";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
import { Database } from "./database";
import { ImageData } from './../src/app/image-data';

let win: BrowserWindow;

let executeDb = (callback) => {
  const database = new Database();
  return callback(database).then(
      result => database.close().then( () => result ),
      err => database.close().then( () => { throw err; } )
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

function getImageMetaData(imagePath) {
  console.log("Received 'imageDataLookup' message in main.ts with arg: " + imagePath + "...");
  let someRows = [];
  let query = "select id, file_name, file_path from image_data where full_path = ?";
  executeDb(database => database.query(query, [imagePath]).then(rows => someRows)).then(() => {
    let imageData: ImageData = null;
    for (let row of someRows) {
      console.log(row['id']);
      console.log(row['file_path']);
      console.log(row['file_name']);
      imageData = new ImageData();
      imageData.id = row['id'];
      imageData.fullPath = row['file_path'] + row['file_name'];
      imageData.fileName = row['file_name'];
      imageData.filePath = row['file_path'];
      break;
    }
    win.webContents.send("imageDataLookupResponse", imageData);
  }).catch( err => {
    // handle the error
    win.webContents.send("imageDataLookupResponse", "Error with query: " + err);
  });
}

ipcMain.on("addTagToImage", (event, arg) => {
  // the arg is expected to contain the full image path and the tag name
  // if the tag name does not exist, then a new tag will be added
  win.webContents.send("addTagToImageResponse", addTagToImage(arg));
});

function addTagToImage(tagParam: any) {
  console.log(tagParam);
  let tag: string = tagParam.tag;
  let imagePath: string = tagParam.img;
  let someRows;
  let query: string = "select id from tag where tag_nm = ?";
  executeDb(database => database.query(query, [tag]).then(rows => someRows)).then(() => {
    if (someRows && someRows.length > 0) {
      // this tag already exists, don't insert it
    } else {
      // this tag does not exist, insert it
    }
    win.webContents.send("addTagToImageResponse", null);
  }).catch( err => {
    // handle the error
    win.webContents.send("addTagToImageResponse", "Error with query: " + err);
  });
}
