import {Component, OnInit} from '@angular/core';
import {ImageData} from "src/app/image-data";
import {Tag} from "src/app/tag";
import {FileService} from "src/app/file.service";
import {Router} from "@angular/router";
import {ModalHelperService} from "src/app/modal-helper.service";

@Component({
  selector: 'img-simple-view',
  templateUrl: './simple-view.component.html',
  styleUrls: ['./simple-view.component.css']
})
export class SimpleViewComponent implements OnInit {
  busy: boolean = true;
  busyMessage: string = null;
  currentIndex: number = -1;
  currentMetaData: ImageData = null;
  imageDataArray: ImageData[] = [];
  filteredImageDataArray: ImageData[] = [];
  tags: Tag[] = [];
  tagNames: string[] = [];
  shownTags: {[tagName:string]: boolean} = {};
  tagFlags: {[tagName:string]: boolean} = {};
  shownTagsForFilterTags: {[tagName:string]: boolean} = {};
  filterImageFlags: {[tagName:string]: boolean} = {};
  showMoreButtons: boolean = false;
  sending: boolean = false;
  rotate: boolean = false;

  constructor(private fileService: FileService, private route: Router, private modalHelperService: ModalHelperService) { }

  ngOnInit() {
    let tmpImgDataArray: ImageData[] = this.fileService.imageDataArray;
    let tmpFilteredImgDataArray: ImageData[] = this.fileService.filteredImageDataArray;
    if (tmpFilteredImgDataArray && tmpFilteredImgDataArray.length > 0 && tmpImgDataArray && tmpImgDataArray.length > 0) {
      this.busy = true;
      this.busyMessage = "Retrieving all the images ...";
      this.imageDataArray = tmpImgDataArray;
      this.filteredImageDataArray = tmpFilteredImgDataArray;
      this.fileService.getTags().then((tags: Tag[]) => {
        tags.forEach(tg => this.tags.push(tg));
        this.tags.forEach(tag => {
          this.shownTags[tag.tagName] = true;
          this.tagNames.push(tag.tagName.toUpperCase());
        });
        this.next();
        this.busy = false;
        this.busyMessage = null;
      });
    } else {
      this.busy = true;
      this.busyMessage = "Retrieving all the images ...";
      let dirPath = "C:/backup/pictures";
      Promise.all([
        this.fileService.getTags(),
        this.fileService.getAllImageData(),
        this.fileService.getFiles(dirPath)
      ]).then((results: any[]) => {
        results[0].forEach(tg => {
          this.tags.push(tg);
        });
        let allImageData: {[fullPath:string]: ImageData} = results[1];
        let files: string[] = results[2];
        let filesFound = files.filter(
          file => !file.toLowerCase().endsWith(".db")
            && !file.toLowerCase().endsWith(".mp4")
            && !file.toLowerCase().endsWith(".3gp")
            && !file.toLowerCase().endsWith(".docx")
            && !file.toLowerCase().endsWith(".ico")
            && !file.toLowerCase().endsWith(".wlmp")
            && !file.toLowerCase().endsWith(".mov"));
        filesFound.forEach(fullFilePath => {
          let img: ImageData = allImageData[fullFilePath];
          if (!img) {
            img = new ImageData();
            img.fullPath = fullFilePath;
            let parts: string[] = fullFilePath.split("/");
            img.fileName = parts[parts.length - 1];
            img.filePath = img.fullPath.replace("/" + img.fileName, "");
          }
          this.imageDataArray.push(img);
        });
        // creat a shallow copy of this array, so that we can use it for filtering
        this.filteredImageDataArray = this.imageDataArray.slice();
        this.tags.forEach(tag => {
          this.shownTags[tag.tagName] = true;
          this.tagNames.push(tag.tagName.toUpperCase());
        });

        this.next();
        this.busy = false;
        this.busyMessage = null;
      });
    }
  }

  next() {
    console.log("Entering next()...");
    this.currentIndex === (this.filteredImageDataArray.length - 1) ? this.currentIndex = 0 : this.currentIndex = this.currentIndex + 1;
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
  }

  prev() {
    this.currentIndex === 0 ? this.currentIndex = this.filteredImageDataArray.length - 1 : this.currentIndex = this.currentIndex - 1;
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
  }

  doRandom() {
    console.log("Entering doRandom()...");
    this.currentIndex = Math.floor(Math.random() * (this.filteredImageDataArray.length - 1));
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
  }

  gridView() {
    //console.log("Grid View clicked");
    this.fileService.filteredImageDataArray = this.filteredImageDataArray;
    this.fileService.imageDataArray = this.imageDataArray;
    this.route.navigate(['grid']);
  }

  selectTagForFilter(checked: boolean, tagName: string) {
    console.log("Setting tag " + tagName + " to " + (checked ? "Selected" : "Unselected") + "...");
    this.filterImageFlags[tagName] = checked;
    this.filterImages();
    this.gotoTop();
  }
  filterImages() {
    let checkedIncludeTags: string[] = Object.keys(this.filterImageFlags).filter(key => this.filterImageFlags[key]);
    let numberIncludedChecked: number = checkedIncludeTags.length;
    let anyChecked: boolean =  numberIncludedChecked > 0;
    if (!anyChecked) {
      console.log("Nothing checked for include or exclude - resetting filteredImageDataArray and returning");
      this.filteredImageDataArray = this.imageDataArray.slice();
      this.currentIndex = -1;
      this.next();
      return;
    } else {
      console.log("There are " + numberIncludedChecked + " tags checked for include");
      this.filteredImageDataArray = this.imageDataArray.filter((img: ImageData) => {
        // filter mode is assumed to be "any", so it only needs to match one
        // of the selected tags in order to be returned
        for (let tag of img.tags) {
          if (this.filterImageFlags[tag.tagName]) {
            return img;
          }
        }
      });
    }

    if (!this.filteredImageDataArray || this.filteredImageDataArray.length === 0) {
      // display message and then put the image array back to all images & reset the filter flags
      this.modalHelperService.alert({message: "There were no images found matching the selected filters.  Resetting filters.", header: "No Images Found"}).result.then(() => {
        console.log("Message displayed...");
      });
      this.clearFilters();
    } else {
      this.currentIndex = -1;
      this.next();
    }
  }

  clearFilters() {
    this.tags.forEach(tag => {
      this.filterImageFlags[tag.tagName] = false;
    });
    this.filteredImageDataArray = this.imageDataArray.slice();
    this.currentIndex = -1;
    this.next();
  }

  deleteImage() {
    this.modalHelperService.confirm({message: "Are you sure you would like to delete the current image?", header: "Delete Image?", labels:["Delete", "Keep"]}).result.then((value: any) => {
        console.log("User chose to delete the current image: " + this.currentMetaData.fullPath);
        this.fileService.deleteFile(this.currentMetaData.fullPath).then((response: string) => {
          if (response.startsWith("Error")) {
            this.modalHelperService.alert({message: response});
          } else {
            let messages:string[] = this.fileService.deleteImage(this.currentMetaData.id);
            console.log("Here are the messages back from the 2 operations:");
            console.log(messages);
            console.log("Now removing the elements from the array...");
            let elementPos = this.imageDataArray.map((x) => {
              return x.id;
            }).indexOf(this.currentMetaData.id);
            let currentImagePath: string = this.currentMetaData.fullPath;
            this.imageDataArray.splice(elementPos, 1);
            this.filteredImageDataArray.splice(this.currentIndex, 1);
            this.next();
            this.modalHelperService.alert({message: currentImagePath + " has been deleted!"});
          }
        });
      },
      () => {
        console.log("User chose not to delete the current image");
      });
  }

  copyImageToClipboard() {
    this.fileService.copyImageToClipboard(this.filteredImageDataArray[this.currentIndex].fullPath).then((response: string) => {
      console.log("Response from copying image: " + response);
    });
  }

  openImageInApp() {
    this.fileService.openImageInApp(this.filteredImageDataArray[this.currentIndex].fullPath).then((response: string) => {
      console.log("Response from opening image: " + response);
    });
  }

  advancedView() {
    this.route.navigate(['main']);
  }

  private gotoTop() {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  private updateUiAfterNavigate() {
    console.log("Entering updateUiAfterNavigate...");
    this.rotate = false;
    this.tags.forEach(tag => {
      this.tagFlags[tag.tagName] = false;
    });
    if (!this.currentMetaData) {
      return;
    }
    if (this.currentMetaData.tags && this.currentMetaData.tags.length > 0) {
      for (let tag of this.currentMetaData.tags) {
        console.log("updateFlags - processing tag '" + tag.tagName + "'");
        this.tagFlags[tag.tagName] = true;
      }
    }
    this.fileService.getImageDetailsSync(this.currentMetaData.fullPath).then(response => {
      if (response && response.exif) {
        console.log("app.component-Received EXIF response...");
        this.currentMetaData.exifData = response;
      }
    });
    this.tags.forEach(tag => {
      this.shownTags[tag.tagName] = true;
    });
  }

  shareEmailToTina() {
    let destEmail = 'tinawarsa@gmail.com';
    //let destText = '6024301974@mms.att.net';
    this.sending = true;
    this.fileService.shareImageToEmail(this.currentMetaData, destEmail).then(response => {
      if (response) {
        this.modalHelperService.alert({message: "The current image has been sent via email"});
      } else {
        console.log("No response back from email call...");
      }
      this.sending = false;
    }, () => console.log("Error in email call..."));
  }
}
