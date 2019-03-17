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
  filesFound: string[] = [];
  busy: boolean = true;
  busyMessage: string = null;
  currentFile: string = null;
  currentIndex: number = 0;
  lastIndexes: number[] = [0];
  currentLastViewedIndexInLastIndexes: number = 0;
  currentMetaData: ImageData = null;
  showForm: boolean = false;
  newTag: string = null;
  existingTag: Tag = null;
  tags: Tag[] = [];
  constructor(private fileService: FileService) { }

  ngOnInit() {
    this.busy = true;
    this.busyMessage = "Retrieving all the images ...";
    let dirPath = "C:/backup/pictures";
    Promise.all([this.fileService.getTags(), this.fileService.getFiles(dirPath)]).then((results: any[]) => {
      this.tags = results[0];
      let files: string[] = results[1];
      this.filesFound = files.filter(
        file => !file.toLowerCase().endsWith(".db") 
              && !file.toLowerCase().endsWith(".mp4") 
              && !file.toLowerCase().endsWith(".3gp") 
              && !file.toLowerCase().endsWith(".docx")
              && !file.toLowerCase().endsWith(".ico")
              && !file.toLowerCase().endsWith(".mov"));
      this.busy = false;
      this.busyMessage = null;
    });
  }

  doRandom() {
    let randNum: number = Math.floor(Math.random() * (this.filesFound.length - 1));
    console.log("Random number between 0 and " + (this.filesFound.length - 1) + ": " + randNum);
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex = randNum;
    this.getCurrentImageMetaData();
    this.scroll(this.currentIndex);
  }

  next() {
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex === (this.filesFound.length - 1) ? this.currentIndex = 0 : this.currentIndex = this.currentIndex + 1;
    this.getCurrentImageMetaData();
    this.scroll(this.currentIndex);
  }

  back() {
    this.currentIndex = this.lastIndexes[this.currentLastViewedIndexInLastIndexes];
    if (this.currentLastViewedIndexInLastIndexes > 0) {
      this.currentLastViewedIndexInLastIndexes -= 1;
    }
    this.getCurrentImageMetaData();
    this.scroll(this.currentIndex);
  }

  prev() {
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex === 0 ? this.currentIndex = this.filesFound.length - 1 : this.currentIndex = this.currentIndex - 1;
    this.getCurrentImageMetaData();
    this.scroll(this.currentIndex);
  }

  private getCurrentImageMetaData() {
    console.log("Calling fileService.getImageMetaData for file " + this.filesFound[this.currentIndex]);
    this.fileService.getImageMetaData(this.filesFound[this.currentIndex]).then((imageData: ImageData) => {
      if (imageData === null) {
        // nothing back from database, so need create one for insert
        this.currentMetaData = new ImageData();
        this.currentMetaData.fullPath = this.filesFound[this.currentIndex];
        let parts: string[] = this.filesFound[this.currentIndex].split("/");
        this.currentMetaData.fileName = parts[parts.length - 1];
        this.currentMetaData.filePath = this.currentMetaData.fullPath.replace("/" + this.currentMetaData.fileName, "");
        console.log("Nothing back from database, so created ImageData object from current file:");
        console.log(this.currentMetaData);
      } else {
        this.currentMetaData = new ImageData();
        this.currentMetaData.id = imageData.id;
        this.currentMetaData.fileName = imageData.fileName;
        this.currentMetaData.filePath = imageData.filePath;
        this.currentMetaData.fullPath = imageData.fullPath;
        this.fileService.getTagsForImage(this.currentMetaData.id).then((tagsForImage: Tag[]) => {
          if (tagsForImage && tagsForImage.length > 0) {
            this.currentMetaData.tags = tagsForImage;
          }
        });
        console.log("Got image metadata back from DB for path:" + this.filesFound[this.currentIndex]);
        console.log(this.currentMetaData);
      }
    });
  }

  copyImageToClipboard() {
    this.fileService.copyImageToClipboard(this.filesFound[this.currentIndex]).then((response: string) => {
      console.log("Response from copying image: " + response);
    });
  }

  openImageInApp() {
    this.fileService.openImageInApp(this.filesFound[this.currentIndex]).then((response: string) => {
      console.log("Response from opening image: " + response);
    });
  }

  viewForm() {
    this.showForm = true;
    this.newTag = null;
    this.existingTag = null;
  }

  addTag() {
    if (this.newTag) {
      // the user has entered a new tag, so treat it as such - first try to look it up
      // just to make sure they didn't enter a duplicate one that already exists
      this.fileService.getTagId(this.newTag).then((tagId: string) => {
        console.log("Finished getting tag, here is the response: ");
        console.log(tagId);
        if (tagId) {
          if (this.currentMetaData.id === -1) {
            // the currently displayed image either has not been looked up yet, or
            // does not yet exist in the database
            this.locateImageId(tagId);
          } else {
            // the currently displayed image already has a database id, so don't look it up
            // insert image_tag record
            this.insertImageTag(this.currentMetaData.id, tagId);
          }
        } else {
          this.insertTag();
        }
      });
    } else {
      // the user has selected an existing tag
      if (this.currentMetaData.id === -1) {
        // the currently displayed image either has not been looked up yet, or
        // does not yet exist in the database
        this.locateImageId(this.existingTag.id);
      } else {
        // the currently displayed image already has a database id, so don't look it up
        // insert image_tag record
        this.insertImageTag(this.currentMetaData.id, this.existingTag.id);
      }
    }
  }

  private insertTag() {
    this.fileService.saveTag(this.newTag).then(tagId => {
      console.log("Finished saving tag, here is the response: ");
      console.log(tagId);
      if (tagId) {
        let newTag: Tag = new Tag();
        newTag.id = parseInt(tagId);
        newTag.tagName = this.newTag;
        this.tags.push(newTag);
        this.tags.sort((a: Tag, b: Tag) => {
          return a.tagName.toLowerCase().localeCompare(b.tagName.toLowerCase());
        });
        this.locateImageId(tagId);
      } else {
        console.log("No tagId came back from fileService.saveImage");
      }
    });
  }

  private locateImageId(tagId) {
    this.fileService.getImageId(this.currentMetaData.fullPath).then(imageId => {
      console.log("Finished locating image, here is the response: ");
      console.log(imageId);
      if (imageId) {
        // insert image_tag record
        this.insertImageTag(imageId, tagId);
      } else {
        // insert the image for the first time
        this.insertImage(tagId);
      }
    });
  }

  private insertImage(tagId) {
    this.fileService.saveImage(this.currentMetaData).then(imageId => {
      console.log("Finished saving image, here is the response: ");
      console.log(imageId);
      if (imageId) {
        // insert image record
        this.currentMetaData.id = parseInt(imageId);
        this.insertImageTag(imageId, tagId);
      } else {
        console.log("No imageId came back from fileService.saveImage");
      }
    });
  }

  private insertImageTag(imageId, tagId) {
    this.fileService.saveImageTag(imageId, tagId).then(result => {
      console.log("Finished saving image_tag record, here is the response: ");
      console.log(result);
      this.showForm = false;
    });
  }

  private scroll(id) {
    console.log(`scrolling to ${id + 1}`);
    let el = document.getElementById(id + 1);
    if (el) {
      el.scrollIntoView();
    }
  }
}
