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
  addTagToImage(arg);
  
});

function addTagToImage(tagParam: any) {
  console.log("main.addTagToImage starting...");
  let tag: string = tagParam.tag;
  let imageFullPath: string = tagParam.fullPath;
  let imageFileName: string = tagParam.fileName;
  let imageFilePath: string = tagParam.filePath;
  let imageQuery: string = "select id from image_data where full_path = ?";
  let imageInsert: string = "insert into image_data (full_path, file_name, file_path) values(?, ?, ?)";
  let tagQuery: string = "select id from tag where tag_nm = ?";
  let tagInsert: string = "insert into tag (tag_nm) values(?)";
  let imageTagInsert: string = "insert into image_tag (image_id, tag_id) values(?,?)";
  let tagId = null;
  let imageId = null;
  let lastQueryRan = tagQuery;
  let chainNo: number = 0;
  console.log("Chain " + chainNo + ": Running tag query for tag '" + tag + "'...");
  executeDb(
    database => database.query(tagQuery, [tag])
      .then(rows => {
        chainNo += 1;
        if (!rows || rows.length === 0) {
          console.log("Chain " + chainNo + ": No results returned for tag '" + tag + "'.  Running tag insert...");
          lastQueryRan = tagInsert;
          return database.query(tagInsert, [tag]);
        } else {
          tagId = rows[0]['id'];
          console.log("Chain " + chainNo + ": Tag id '" + tagId + " was found for tag '" + tag + "'.  Running image query...");
          lastQueryRan = imageQuery;
          return database.query(imageQuery, [imageFullPath]);
        }
      })
      .then(rows => {
        chainNo += 1;
        console.log("Chain " + chainNo + ": Last query ran was '" + lastQueryRan + "'...");
        if (lastQueryRan === imageQuery) {
          // that means rows contains the imageQuery results
          if (!rows || rows.length === 0) {
            lastQueryRan = imageInsert;
            console.log("Chain " + chainNo + ": No results returned for image '" + imageFullPath + "'.  Running image insert...");
            return database.query(imageInsert, [imageFullPath, imageFileName, imageFilePath]);
          } else {
            // an image was found, and there is a tagId, so run the imageTagInsert
            imageId = rows[0]['id'];
            lastQueryRan = imageTagInsert;
            console.log("Chain " + chainNo + ": Image id '" + imageId + " was found for image '" + imageFullPath + "'.  Running imageTag insert...");
            return database.query(imageTagInsert, [imageId, tagId]);
          }
        } else if (lastQueryRan === tagInsert) {
          // this means rows contains the tagInsert results
          tagId = rows.insertId;
          console.log("Chain " + chainNo + ": New tag inserted with id '" + tagId + " now running query for image '" + imageFullPath + "'...");
          // therefore, we need to now run the imageQuery
          lastQueryRan = imageQuery;
          return database.query(imageQuery, [imageFullPath]);
        }
      })
      .then(rows => {
        chainNo += 1;
        console.log("Chain " + chainNo + ": Last query ran was '" + lastQueryRan + "'...");
        switch (lastQueryRan) {
          case imageQuery:
            // that means rows contains the imageQuery results
            if (!rows || rows.length === 0) {
              lastQueryRan = imageInsert;
              console.log("Chain " + chainNo + ": No results returned for image '" + imageFullPath + "'.  Running image insert...");
              return database.query(imageInsert, [imageFullPath, imageFileName, imageFilePath]);
            } else {
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
      .then(rows => {
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
      .then(rows => {
        chainNo += 1;
        console.log("Chain " + chainNo + ": Last query ran was '" + lastQueryRan + "'...");
        // the assumption is that this is the final insert
        if (lastQueryRan === imageTagInsert) {
          console.log("Chain " + chainNo + ": ImageTag record inserted with imageId '" + imageId + " and tagId '" + tagId + "', full process complete!");
        }
      })
  ).then( () => {
      // do something with someRows and otherRows
      win.webContents.send("addTagToImageResponse", "tag added - tagId=" + tagId + ", imageId=" + imageId);
  }).catch( err => {
      // handle the error
      win.webContents.send("addTagToImageResponse","Error adding tag: " + err);
  });
}
