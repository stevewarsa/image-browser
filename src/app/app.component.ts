import { Component, OnInit } from '@angular/core';
import { FileService } from './file.service';
import { ImageData } from './image-data';
import { Tag } from './tag';

@Component({
  selector: 'img-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = "Image Browser";
  busy: boolean = true;
  busyMessage: string = null;
  currentIndex: number = -1;
  lastIndexes: number[] = [0];
  currentLastViewedIndexInLastIndexes: number = 0;
  currentMetaData: ImageData = null;
  newTag: string = null;
  tags: Tag[] = [];
  tagRows: Tag[][] = [];
  imageDataArray: ImageData[] = [];
  tagFlags: {[tagName:string]: boolean} = {};

  constructor(private fileService: FileService) { }

  ngOnInit() {
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
      let tmpTags = results[0];
      this.createTagRows(tmpTags);
      let allImageData: {[fullPath:string]: ImageData} = results[1];
      let files: string[] = results[2];
      let filesFound = files.filter(
        file => !file.toLowerCase().endsWith(".db") 
              && !file.toLowerCase().endsWith(".mp4") 
              && !file.toLowerCase().endsWith(".3gp") 
              && !file.toLowerCase().endsWith(".docx")
              && !file.toLowerCase().endsWith(".ico")
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
      this.imageDataArray
      this.next();
      this.busy = false;
      this.busyMessage = null;
    });
  }

  private createTagRows(tmpTags: any) {
    this.tagRows = [];
    while (tmpTags.length > 0) {
      let subArray = tmpTags.splice(0, 6);
      this.tagRows.push(subArray);
    }
  }

  doRandom() {
    let randNum: number = Math.floor(Math.random() * (this.imageDataArray.length - 1));
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex = randNum;
    this.currentMetaData = this.imageDataArray[this.currentIndex];
    this.updateFlags();
  }

  next() {
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex === (this.imageDataArray.length - 1) ? this.currentIndex = 0 : this.currentIndex = this.currentIndex + 1;
    this.currentMetaData = this.imageDataArray[this.currentIndex];
    this.updateFlags();
  }

  private updateFlags() {
    this.tags.forEach(tag => { 
      this.tagFlags[tag.tagName] = false;
    });
    if (this.currentMetaData && this.currentMetaData.tags && this.currentMetaData.tags.length > 0) {
      for (let tag of this.currentMetaData.tags) {
        console.log("updateFlags - processing tag '" + tag.tagName + "'");
        this.tagFlags[tag.tagName] = true;
      }
    }
  }

  back() {
    this.currentIndex = this.lastIndexes[this.currentLastViewedIndexInLastIndexes];
    if (this.currentLastViewedIndexInLastIndexes > 0) {
      this.currentLastViewedIndexInLastIndexes -= 1;
    }
    this.currentMetaData = this.imageDataArray[this.currentIndex];
    this.updateFlags();
  }

  prev() {
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex === 0 ? this.currentIndex = this.imageDataArray.length - 1 : this.currentIndex = this.currentIndex - 1;
    this.currentMetaData = this.imageDataArray[this.currentIndex];
    this.updateFlags();
  }

  copyImageToClipboard() {
    this.fileService.copyImageToClipboard(this.imageDataArray[this.currentIndex].fullPath).then((response: string) => {
      console.log("Response from copying image: " + response);
    });
  }

  openImageInApp() {
    this.fileService.openImageInApp(this.imageDataArray[this.currentIndex].fullPath).then((response: string) => {
      console.log("Response from opening image: " + response);
    });
  }

  addTag() {
    if (this.newTag) {
      // the user has entered a new tag, so treat it as such - first try to look it up
      // just to make sure they didn't enter a duplicate one that already exists
      let locTag = this.newTag;
      this.fileService.getTagId(locTag).then((tagId: string) => {
        console.log("Finished getting tag, here is the response: ");
        console.log(tagId);
        if (!tagId) {
          this.fileService.saveTag(locTag).then(tagId => {
            console.log("Finished saving tag, here is the response: ");
            console.log(tagId);
            if (tagId) {
              let newTag: Tag = new Tag();
              newTag.id = parseInt(tagId);
              newTag.tagName = locTag;
              this.tags.push(newTag);
              this.tags.sort((a: Tag, b: Tag) => {
                return a.tagName.toLowerCase().localeCompare(b.tagName.toLowerCase());
              });
              // slice() creates a shallow copy of the array
              this.createTagRows(this.tags.slice());
              // now make sure the new tag shows up as checked
              this.tagFlags[newTag.tagName] = true;
            } else {
              console.log("No tagId came back from fileService.saveImage");
            }
          });
        }
      });
    }
    this.newTag = null;
  }

  updateTagFromUI(checked, tagName: string) {
    console.log("updateTag - checked=" + checked + ", tagName=" + tagName);
    if (tagName) {
      this.tagFlags[tagName] = checked;
    }
  }

  private updateTagsOnCurrentImage() {
    this.currentMetaData.tags = [];
    // first go through selected tags and make sure this object is updated
    for (let tagName of Object.keys(this.tagFlags)) {
      if (this.tagFlags[tagName]) {
        // the current tag is selected, so add that tag to the image
        let matchingTags: Tag[] = this.tags.filter((tag: Tag) => tag.tagName === tagName);
        if (matchingTags && matchingTags.length === 1) {
          this.currentMetaData.addTag(matchingTags[0]);
        }
      }
    }
  }

  applyTags() {
    // first clear the existing tags on the image
    this.updateTagsOnCurrentImage();
    if (this.currentMetaData.id === -1) {
      // the currently displayed image either has not been looked up yet, or
      // does not yet exist in the database
      this.fileService.saveImage(this.currentMetaData).then(imageId => {
        console.log("Finished saving image, here is the response: ");
        console.log(imageId);
        if (imageId) {
          // we got an image id back so, update the current image object
          this.currentMetaData.id = parseInt(imageId);
          // now remove the tags for this image
          this.deleteImageTags();
        } else {
          console.log("No imageId came back from fileService.saveImage");
        }
      });
    } else {
      // the currently displayed image already has a database id, so don't look it up
      // remove existing image tag records
      this.deleteImageTags();
    }
  }

  private deleteImageTags() {
    this.fileService.deleteImageTags(this.currentMetaData.id).then(result => {
      console.log("Finished deleting image_tag records, here is the number of affected rows: ");
      console.log(result);
      this.insertImageTags();
    });
  }

  private insertImageTags() {
    this.fileService.saveImageTags(this.currentMetaData).then(result => {
      console.log("Finished saving image_tag records, here is the response: ");
      console.log(result);
    });
  }
}
