import { Injectable } from '@angular/core';
import { IpcRenderer } from "electron";
import { ImageData } from './image-data';

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

  // async addTagToImage(imageMetaData: ImageData, tagName: string) {
  //   return new Promise<ImageData>((resolve, reject) => {
  //     this.ipc.once("addTagToImageResponse", (event, arg) => {
  //       resolve(arg);
  //     });
  //     console.log("Sending message to main 'addTagToImage' with image " + imageMetaData.fullPath + " and tag " + tagName + "...");
  //     this.ipc.send("addTagToImage", {fullPath: imageMetaData.fullPath, fileName: imageMetaData.fileName, filePath: imageMetaData.filePath, tag: tagName});
  //   });
  // }
}
