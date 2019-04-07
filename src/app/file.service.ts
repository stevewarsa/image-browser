import { Injectable } from '@angular/core';
import { IpcRenderer } from "electron";
import { ImageData } from './image-data';
import { Tag } from './tag';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private ipc: IpcRenderer;

  constructor() {
    if ((<any>window).require) {
      try {
        this.ipc = (<any>window).require("electron").ipcRenderer;
      } catch (error) {
        throw error;
      }
    } else {
      console.warn("Could not load electron ipc");
    }
  }

  async getFiles(dirPath: string) {
    return new Promise<string[]>((resolve, reject) => {
      this.ipc.once("getFilesResponse", (event, arg) => {
        resolve(arg);
      });
      this.ipc.send("getFiles", dirPath);
    });
  }

  async getAllImageData() {
    return new Promise<{[fullPath:string]: ImageData}>((resolve, reject) => {
      this.ipc.once("getAllImageDataResponse", (event, results) => {
        let imageDataByPath: {[fullPath:string]: ImageData} = {};
        console.log("getAllImageData - here are the results for the query:");
        console.log(results);
        for (let result of results) {
          let fullPath: string = result['full_path'];
          let imageData: ImageData = imageDataByPath[fullPath];
          if (!imageData) {
            imageData = new ImageData();
            imageData.id = parseInt(result['image_id']);
            imageData.fileName = result['file_name'];
            imageData.filePath = result['file_path'];
            imageData.fullPath = fullPath;
            imageDataByPath[fullPath] = imageData;
          }
          // now populate the tag
          if (result['tag_id'] && result['tag_nm'] && result['tag_nm'].length > 0) {
            let tag: Tag = new Tag();
            tag.id = parseInt(result['tag_id']);
            tag.tagName = result['tag_nm'];
            // console.log("getAllImageData - adding tag '" + tag.tagName + "' (tag_id=" + tag.id + ") to image:");
            // console.log(imageData);
            imageData.addTag(tag);
          }
        }
        console.log("getAllImageData - sending back map: ");
        console.log(imageDataByPath);
        resolve(imageDataByPath);
      });
      let sql: string = "select img.id as image_id, full_path, file_name, file_path, t.id as tag_id, tag_nm ";
      sql += "from image_data img ";
      sql += "LEFT JOIN image_tag imgt on img.id = imgt.image_id ";
      sql += "LEFT JOIN tag t on imgt.tag_id = t.id ";
      sql += "order by full_path";
      console.log("getAllImageData - sending SQL statement:");
      console.log(sql);
      this.ipc.send("runSqlStatement", {sql: sql, args: null, respondWith: "getAllImageDataResponse"});
    });
  }

  async copyImageToClipboard(imagePath: string) {
    return new Promise<string>((resolve, reject) => {
      this.ipc.once("copyImageToClipboardResponse", (event, arg) => {
        resolve(arg);
      });
      this.ipc.send("copyImageToClipboard", imagePath);
    });
  }

  async openImageInApp(imagePath: string) {
    return new Promise<string>((resolve, reject) => {
      this.ipc.once("openImageInAppResponse", (event, arg) => {
        resolve(arg);
      });
      this.ipc.send("openImageInApp", imagePath);
    });
  }

  async getImageDetails(imagePath: string) {
    return new Promise<any>((resolve, reject) => {
      this.ipc.once("getImageDetailsResponse", (event, arg) => {
        console.log("file.service-Received EXIF response. Here is the event received:");
        console.log(event);
        resolve(arg);
      });
      console.log("file.service-Sending EXIF request...");
      this.ipc.send("getImageDetails", imagePath);
    });
  }

  deleteFile(fullPath: string) {
    return new Promise<string>((resolve, reject) => {
      let retValue = this.ipc.sendSync("deleteImage", fullPath);
      resolve(retValue);
    });
  }

  getImageDetailsSync(imagePath: string) {
    return new Promise<any>((resolve, reject) => {
      let retValue = this.ipc.sendSync("getImageDetailsSync", imagePath);
      resolve(retValue);
      // this.ipc.once("getImageDetailsSyncResponse", (event, arg) => {
      //   console.log("file.service-Received EXIF response. Here is the event received:");
      //   console.log(event);
      //   resolve(arg);
      // });
    });
  }

  async getImageMetaData(imagePath: string) {
    return new Promise<ImageData>((resolve, reject) => {
      this.ipc.once("imageDataLookupResponse", (event, arg) => {
        console.log("Received imageDataLookupResponse from main process: ");
        console.log(arg);
        resolve(arg);
      });
      console.log("Sending message to main 'imageDataLookup' with arg " + imagePath);
      this.ipc.send("imageDataLookup", imagePath);
    });
  }

  async getTagsForImage(imageId: number) {
    return new Promise<Tag[]>((resolve, reject) => {
      this.ipc.once("getTagsForImageResponse", (event, results) => {
        let tags: Tag[] = [];
        for (let result of results) {
          //console.log("FileService.getTags - processing tagId=" + result['id'] + ", tagNm=" + result['tag_nm']);
          let tag: Tag = new Tag();
          tag.id = parseInt(result['id']);
          tag.tagName = result['tag_nm'];
          tags.push(tag);
        }
        resolve(tags);
      });
      //console.log("Sending message to main 'runSqlStatement'");
      this.ipc.send("runSqlStatement", {sql: "select id, tag_nm from tag, image_tag where id = tag_id and image_id = ?", args: [imageId], respondWith: "getTagsForImageResponse"});
    });
  }

  deleteImage(imageId: number): string[] {
    let retValues: string[] = [];
    let retValue = this.ipc.sendSync("runSqlStatementSync", {sql: "delete from image_data where id = ?", args: [imageId]});
    retValues.push(retValue);
    retValue = this.ipc.sendSync("runSqlStatementSync", {sql: "delete from image_tag where image_id = ?", args: [imageId]});
    retValues.push(retValue);
    return retValues;
  }

  async deleteImageTags(imageId: number) {
    return new Promise<Tag[]>((resolve, reject) => {
      this.ipc.once("deleteImageTagsResponse", (event, results) => {
        resolve(results.affectedRows);
      });
      this.ipc.send("runSqlStatement", {sql: "delete from image_tag where image_id = ?", args: [imageId], respondWith: "deleteImageTagsResponse"});
    });
  }

  async saveImageTags(imageData: ImageData) {
    return new Promise<Tag[]>((resolve, reject) => {
      this.ipc.once("saveImageTagsResponse", (event, results) => {
        resolve(results.message);
      });
      let insertStmt = "insert into image_tag (image_id, tag_id) values ";
      for (let tag of imageData.tags) {
        insertStmt += "(" + imageData.id + "," + tag.id + "),";
      }
      insertStmt = insertStmt.substring(0, insertStmt.length - 1)
      this.ipc.send("runSqlStatement", {sql: insertStmt, args: null, respondWith: "saveImageTagsResponse"});
    });
  }

  async getTagId(tagName: string) {
    return new Promise<string>((resolve, reject) => {
      this.ipc.once("getTagIdResponse", (event, arg) => {
        console.log("Received getTagIdResponse from main process: ");
        console.log(arg);
        resolve(arg);
      });
      console.log("Sending message to main 'getTagId' with arg " + tagName);
      this.ipc.send("getTagId", tagName);
    });
  }
  
  async getImageId(fullImagePath: string) {
    return new Promise<string>((resolve, reject) => {
      this.ipc.once("getImageIdResponse", (event, arg) => {
        console.log("Received getImageIdResponse from main process: ");
        console.log(arg);
        resolve(arg);
      });
      console.log("Sending message to main 'getImageId' with arg " + fullImagePath);
      this.ipc.send("getImageId", fullImagePath);
    });
  }
  
  async saveImage(imageMetaData: ImageData) {
    return new Promise<string>((resolve, reject) => {
      this.ipc.once("saveImageResponse", (event, arg) => {
        console.log("Received saveImageResponse from main process: ");
        console.log(arg);
        resolve(arg);
      });
      console.log("Sending message to main 'saveImage' with arg: ");
      console.log(imageMetaData);
      this.ipc.send("saveImage", imageMetaData);
    });
  }
  
  async saveTag(tagName: string) {
    return new Promise<string>((resolve, reject) => {
      this.ipc.once("saveTagResponse", (event, arg) => {
        console.log("Received saveTagResponse from main process: ");
        console.log(arg);
        resolve(arg);
      });
      console.log("Sending message to main 'saveTag' with arg: ");
      console.log(tagName);
      this.ipc.send("saveTag", tagName);
    });
  }
  
  async saveImageTag(imageId, tagId) {
    return new Promise<string>((resolve, reject) => {
      this.ipc.once("saveImageTagResponse", (event, arg) => {
        console.log("Received saveImageTagResponse from main process: ");
        console.log(arg);
        resolve(arg);
      });
      console.log("Sending message to main 'saveImageTag' with args: ");
      console.log("imageId=" + imageId);
      console.log("tagId=" + tagId);
      this.ipc.send("saveImageTag", {imageId: imageId, tagId: tagId});
    });
  }

  async getTags() {
    return new Promise<Tag[]>((resolve, reject) => {
      this.ipc.once("getTagsResponse", (event, results) => {
        let tags: Tag[] = [];
        for (let result of results) {
          //console.log("FileService.getTags - processing tagId=" + result['id'] + ", tagNm=" + result['tag_nm']);
          let tag: Tag = new Tag();
          tag.id = parseInt(result['id']);
          tag.tagName = result['tag_nm'];
          tags.push(tag);
        }
        resolve(tags);
      });
      //console.log("Sending message to main 'runSqlStatement'");
      this.ipc.send("runSqlStatement", {sql: "select id, tag_nm from tag order by tag_nm", args: null, respondWith: "getTagsResponse"});
    });
  }
}
