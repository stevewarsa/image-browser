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
      this.ipc.once("getImageMetaDataResponse", (event, arg) => {
        resolve(arg);
      });
      console.log("Sending message to main 'getImageMetaData' with arg " + imagePath);
      this.ipc.send("getImageMetaData", imagePath);
    });
  }
}
