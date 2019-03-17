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
      this.ipc.once("runSqlStatementResponse", (event, results) => {
        let imageDataByPath: {[fullPath:string]: ImageData} = {};
        for (let result of results) {
          let fullPath: string = result['full_path'];
          let imageData: ImageData = imageDataByPath[fullPath];
          if (!imageData) {
            imageData = new ImageData();
            imageData.id = parseInt(result['id']);
            imageData.fileName = result['file_name'];
            imageData.filePath = result['file_path'];
            imageData.fullPath = fullPath;
            imageDataByPath[fullPath] = imageData;
          }
          // now populate the tag
          if (result['tag_id'] && result['tag_id'].length > 0 && result['tag_nm'] && result['tag_nm'].length > 0) {
            let tag: Tag = new Tag();
            tag.id = parseInt(result['tag_id']);
            tag.tagName = result['tag_nm'];
            imageData.addTag(tag);
          }
        }
        resolve(imageDataByPath);
      });
      let sql: string = "select img.id as image_id, full_path, file_name, file_path, t.id as tag_id, tag_nm ";
      sql += "from image_data img ";
      sql += "LEFT JOIN image_tag imgt on img.id = imgt.image_id ";
      sql += "LEFT JOIN tag t on imgt.tag_id = t.id ";
      sql += "order by full_path";
      this.ipc.send("runSqlStatement", {sql: sql, args: null});
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
      this.ipc.once("runSqlStatementResponse", (event, results) => {
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
      this.ipc.send("runSqlStatement", {sql: "select id, tag_nm from tag, image_tag where id = tag_id and image_id = ?", args: [imageId]});
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
      this.ipc.once("runSqlStatementResponse", (event, results) => {
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
      this.ipc.send("runSqlStatement", {sql: "select id, tag_nm from tag", args: null});
    });
  }
}
