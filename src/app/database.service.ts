import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import { ImageData } from './image-data';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
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
