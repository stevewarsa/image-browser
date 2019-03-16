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
        resolve(arg);
      });
      console.log("Sending message to main 'imageDataLookup' with arg " + imagePath);
      this.ipc.send("imageDataLookup", imagePath);
    });
  }

  async addTagToImage(imageMetaData: ImageData, tagName: string) {
    return new Promise<ImageData>((resolve, reject) => {
      this.ipc.once("addTagToImageResponse", (event, arg) => {
        resolve(arg);
      });
      console.log("Sending message to main 'addTagToImage' with image " + imageMetaData.fullPath + " and tag " + tagName + "...");
      this.ipc.send("addTagToImage", {fullPath: imageMetaData.fullPath, fileName: imageMetaData.fileName, filePath: imageMetaData.filePath, tag: tagName});
    });
  }
}
