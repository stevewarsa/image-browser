import { Component, OnDestroy, OnInit } from '@angular/core';
import { FileService } from '../file.service';
import { ModalHelperService } from '../modal-helper.service';
import { Router } from '@angular/router';
import { ImageData } from '../image-data';

@Component({
  selector: 'img-grid-view',
  templateUrl: './grid-view.component.html',
  styleUrls: ['./grid-view.component.css']
})
export class GridViewComponent implements OnInit, OnDestroy {
  filteredImageDataArray: ImageData[] = [];
  imageDataArray: ImageData[] = [];
  busy: boolean = false;
  busyMessage: string = null;
  imagesSelected: {[imageFullPath: string]: ImageData} = {};
  showSelected = false;
  obj = Object;
  imagesDeleted = false;

  constructor(private fileService: FileService, private modalHelperService: ModalHelperService, private route: Router) { }

  ngOnInit() {
    this.busy = true;
    this.busyMessage = "Retrieving all images from file service...";
    let tmpFilteredImages: ImageData[] = this.fileService.filteredImageDataArray;
    tmpFilteredImages = tmpFilteredImages.sort((a: ImageData, b: ImageData) => {
      return a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase());
    });
    this.filteredImageDataArray = tmpFilteredImages;
    this.imageDataArray = this.fileService.imageDataArray;
    this.busy = false;
    this.busyMessage = null;
  }
  ngOnDestroy(): void {
    if (this.imagesDeleted) {
      // clear out the cache so that the main screen will lookup all the images again...
      this.fileService.imageDataArray = null;
      this.fileService.filteredImageDataArray = null;
    }
  }

  back() {
    this.route.navigate([''])
  }

  delete(img: ImageData) {
    this.modalHelperService.confirm({message: "Are you sure you would like to delete the current image?", header: "Delete Image?", labels:["Delete", "Keep"]}).result.then((value: any) => {
      console.log("User chose to delete the current image: " + img.fullPath);
      this.fileService.deleteFile(img.fullPath).then((response: string) => {
        if (response.startsWith("Error")) {
          this.modalHelperService.alert({message: response});
        } else {
          let messages:string[] = this.fileService.deleteImage(img.id);
          console.log("Here are the messages back from the 2 operations:");
          console.log(messages);
          console.log("Now removing the elements from the array...");
          let elementPos = this.imageDataArray.map(x => x.id).indexOf(img.id);
          this.imageDataArray.splice(elementPos, 1);
          elementPos = this.filteredImageDataArray.map(x => x.id).indexOf(img.id);
          this.filteredImageDataArray.splice(elementPos, 1);
          this.imagesSelected[img.fullPath] = null;
          delete this.imagesSelected[img.fullPath];
          this.showSelected = false;
          this.imagesDeleted = true;
        }
      });
    },
    () => {
      console.log("User chose not to delete the current image");
    });
  }

  copyImageToClipboard(imgPath: string) {
    this.fileService.copyImageToClipboard(imgPath).then((response: string) => {
      console.log("Response from copying image: " + response);
    });
  }

  openImageInApp(imgPath: string) {
    this.fileService.openImageInApp(imgPath).then((response: string) => {
      console.log("Response from opening image: " + response);
    });
  }

  selectForCompare(img: ImageData) {
    if (this.imagesSelected[img.fullPath] === undefined || !this.imagesSelected[img.fullPath]) {
      // the image didn't exist in the map yet, so add it
      this.imagesSelected[img.fullPath] = img;
      //this.showSelected = true;
    } else {
      // image already exists in the map, so remove it
      delete this.imagesSelected[img.fullPath];
    }
  }

  deleteSelected() {
    let filePaths = Object.keys(this.imagesSelected);
    let filePathsSelected: string[] = [];
    let imagesSelected: ImageData[] = [];
    for (let filePath of filePaths) {
      if (this.imagesSelected[filePath]) {
        filePathsSelected.push(filePath);
        imagesSelected.push(this.imagesSelected[filePath]);
      }
    }
    if (filePathsSelected.length > 0) {
      console.log("Deleting the following files:");
      console.log(filePathsSelected);
      this.modalHelperService.openDeleteImages(imagesSelected).result.then((imagesDeleted: ImageData[]) => {
        if (imagesDeleted) {
          for (let img of imagesDeleted) {
            console.log("Now removing the elements from the array...");
            let elementPos = this.imageDataArray.map(x => x.id).indexOf(img.id);
            this.imageDataArray.splice(elementPos, 1);
            elementPos = this.filteredImageDataArray.map(x => x.id).indexOf(img.id);
            this.filteredImageDataArray.splice(elementPos, 1);
          }
          this.imagesDeleted = true;
        }
      });
    }
  }
}
