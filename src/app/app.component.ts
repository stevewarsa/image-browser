import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FileService } from './file.service';
import { ImageData } from './image-data';
import { Tag } from './tag';
import { ModalHelperService } from './modal-helper.service';

@Component({
  selector: 'img-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  busy: boolean = true;
  busyMessage: string = null;
  currentIndex: number = -1;
  lastIndexes: number[] = [0];
  currentLastViewedIndexInLastIndexes: number = 0;
  currentMetaData: ImageData = null;
  newTag: string = null;
  tags: Tag[] = [];
  tagNames: string[] = [];
  imageDataArray: ImageData[] = [];
  filteredImageDataArray: ImageData[] = [];
  tagFlags: {[tagName:string]: boolean} = {};
  filterMode: string = "all"; 
  showForm: boolean = false;
  showExcludeForm: boolean = false;
  ourCamera: boolean = false;
  shownTags: {[tagName:string]: boolean} = {};
  shownTagsForFilterTags: {[tagName:string]: boolean} = {};
  shownTagsForExcludeTags: {[tagName:string]: boolean} = {};
  filterImageFlags: {[tagName:string]: boolean} = {};
  excludeImageFlags: {[tagName:string]: boolean} = {};
  @ViewChild('tagInput') tagInput: ElementRef;
  @ViewChild('filterTagInputInForm') filterTagInputInForm: ElementRef;
  @ViewChild('excludeTagInputInForm') excludeTagInputInForm: ElementRef;

  constructor(private fileService: FileService, private modalHelperService: ModalHelperService) { }

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
        this.shownTagsForFilterTags[tag.tagName] = true;
        this.shownTagsForExcludeTags[tag.tagName] = true;
        this.tagNames.push(tag.tagName.toUpperCase());
      });
      
      this.next();
      this.busy = false;
      this.busyMessage = null;
    });
  }

  filterItems(event: any) {
    let searchString = event.target.value.toUpperCase().trim();
    Object.keys(this.shownTags).map((key, index) => {
        this.shownTags[key] = key.toUpperCase().includes(searchString); 
    });
  }

  filterTagsForFilter(value: any) {
    let searchString = value.toUpperCase().trim();
    Object.keys(this.shownTagsForFilterTags).map((key, index) => {
        this.shownTagsForFilterTags[key] = key.toUpperCase().includes(searchString); 
    });
  }

  filterTagsForExclude(value: any) {
    let searchString = value.toUpperCase().trim();
    Object.keys(this.shownTagsForExcludeTags).map((key, index) => {
        this.shownTagsForExcludeTags[key] = key.toUpperCase().includes(searchString); 
    });
  }

  filterImages() {
    let checkedIncludeTags: string[] = Object.keys(this.filterImageFlags).filter(key => this.filterImageFlags[key]);
    let checkedExcludeTags: string[] = Object.keys(this.excludeImageFlags).filter(key => this.excludeImageFlags[key]);
    let numberIncludedChecked: number = checkedIncludeTags.length;
    let numberExcludedChecked: number = checkedExcludeTags.length;
    let anyChecked: boolean =  numberIncludedChecked > 0 || numberExcludedChecked > 0;
    if (!anyChecked) {
      console.log("Nothing checked for include or exclude - resetting filteredImageDataArray and returning");
      this.filteredImageDataArray = this.imageDataArray.slice();
      this.showForm = false;
      this.currentIndex = -1;
      this.next();
      return;
    } else {
      console.log("There are " + numberIncludedChecked + " tags checked for include");
      console.log("There are " + numberExcludedChecked + " tags checked for exclude");
    }
    let imagesIncluded: ImageData[] = null;
    if (numberIncludedChecked > 0) {
      imagesIncluded = this.imageDataArray.filter((img: ImageData) => {
        if (this.filterMode === "all") {
          let matchedAll: boolean = true;
          // go through each of the tags that have been selected for 
          // filter. If the current image doesn't include each and 
          // every tag, it is considered "not matched".
          for (let tag of checkedIncludeTags) {
            if (!img.tags.map(tg => tg.tagName).includes(tag)) {
              matchedAll = false;
              break;
            }
          }
          // only if the current image matched all tags, do we return it
          if (matchedAll) {
            return img;
          }
        } else {
          // filter mode is assumed to be "any", so it only needs to match one 
          // of the selected tags in order to be returned
          for (let tag of img.tags) {
            if (this.filterImageFlags[tag.tagName]) {
              return img;
            }
          }
        }
      });
    } else {
      // if nothing is checked for include, then include all images
      imagesIncluded = this.imageDataArray.slice();
    }

    // now, take the imagesIncluded and filter out any images having tags on the exclude list
    this.filteredImageDataArray = imagesIncluded.filter((img: ImageData) => {
      let noExcludedTags: boolean = true;
      for (let tag of img.tags) {
        if (this.excludeImageFlags[tag.tagName]) {
          noExcludedTags = false;
          break;
        }
      }
      if (noExcludedTags) {
        return img;
      }
    });
    this.showForm = false;
    this.showExcludeForm = false;
    this.currentIndex = -1;
    this.next();
  }

  filterToImagesWithoutTags() {
    this.filteredImageDataArray = this.imageDataArray.filter((img: ImageData) => img.id === -1 && (img.tags === null || img.tags.length === 0));
    this.showForm = false;
    this.currentIndex = -1;
    this.next();
  }

  addTagsDirectly(tags: string[]) {
    let tagsToSend: Tag[] = this.tags.filter((tag: Tag) => tags.includes(tag.tagName));
    tagsToSend.forEach((tag: Tag) => this.tagFlags[tag.tagName] = true);
    this.applyTags();
  }

  showTagsPopup(tags: string[], defaultSelected: string[]) {
    let tagsToSend: Tag[] = this.tags.filter((tag: Tag) => tags.includes(tag.tagName));
    this.modalHelperService.openTagSelection(tagsToSend, defaultSelected).result.then((selectedTags: Tag[]) => {
      if (selectedTags && selectedTags.length > 0) {
        selectedTags.forEach((tag: Tag) => this.tagFlags[tag.tagName] = true);
        this.applyTags();
      }
    })
  }

  clearFilters() {
    this.tags.forEach(tag => { 
      this.filterImageFlags[tag.tagName] = false;
      this.excludeImageFlags[tag.tagName] = false;
    });
    this.filteredImageDataArray = this.imageDataArray.slice();
    this.currentIndex = -1;
    this.next();
  }

  selectTagForFilter(checked: boolean, tagName: string) {
    console.log("Setting tag " + tagName + " to " + (checked ? "Selected" : "Unselected") + "...");
    this.filterImageFlags[tagName] = checked;
    this.filterTagInputInForm.nativeElement.value = "";
    this.filterTagsForFilter("");
    this.focusFilterTagInFormInput();
  }

  selectTagForExclude(checked: boolean, tagName: string) {
    console.log("Setting exclusion tag " + tagName + " to " + (checked ? "Selected" : "Unselected") + "...");
    this.excludeImageFlags[tagName] = checked;
    this.excludeTagInputInForm.nativeElement.value = "";
    this.filterTagsForExclude("");
    this.focusExcludeTagInFormInput();
  }

  viewForm() {
    this.showForm = true;
    this.showExcludeForm = false;
    this.focusFilterTagInFormInput();
  }

  viewExcludeForm() {
    this.showForm = false;
    this.showExcludeForm = true;
    this.focusExcludeTagInFormInput();
  }

  getImageDetails() {
    this.fileService.getImageDetails(this.filteredImageDataArray[this.currentIndex].fullPath).then(response => {
      console.log("AppComponent.getImageDetails - response: ");
      console.log(response);
    })
  }

  focusFilterTagInFormInput() {
    setTimeout(() => {
      this.filterTagInputInForm.nativeElement.focus();
    }, 300);
  }

  focusExcludeTagInFormInput() {
    setTimeout(() => {
      this.excludeTagInputInForm.nativeElement.focus();
    }, 300);
  }

  doRandom() {
    let randNum: number = Math.floor(Math.random() * (this.filteredImageDataArray.length - 1));
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex = randNum;
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
  }

  next() {
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex === (this.filteredImageDataArray.length - 1) ? this.currentIndex = 0 : this.currentIndex = this.currentIndex + 1;
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
  }

  private updateUiAfterNavigate() {
    this.tags.forEach(tag => { 
      this.tagFlags[tag.tagName] = false;
    });
    if (this.currentMetaData.tags && this.currentMetaData.tags.length > 0) {
      for (let tag of this.currentMetaData.tags) {
        console.log("updateFlags - processing tag '" + tag.tagName + "'");
        this.tagFlags[tag.tagName] = true;
      }
    }
    this.ourCamera = false;
    this.fileService.getImageDetails(this.currentMetaData.fullPath).then(response => {
      if (response && response.exif) {
        this.currentMetaData.exifData = response;
        if (this.currentMetaData.exifData.image && this.currentMetaData.exifData.image.Make && this.currentMetaData.exifData.image.Model) {
          let ourMakes = ['EASTMAN KODAK COMPANY', 'Research In Motion', 'HTC', 'Motorola', 'motorola', 'Motorola\u0000', 'HP'];
          let ourModels = ['KODAK DX6340 ZOOM DIGITAL CAMERA', 'BlackBerry 8330', 'PC36100', 'DROID RAZR HD', 'HTC6525LVW', 'XT1635-01', 'HP psc1600', 'BlackBerry 9310'];
          this.ourCamera = ourMakes.includes(this.currentMetaData.exifData.image.Make) && ourModels.includes(this.currentMetaData.exifData.image.Model);
        }
      }
    });
    this.focusTagInput();
  }

  private focusTagInput() {
    setTimeout(() => {
      this.tagInput.nativeElement.focus();
    }, 100);
  }

  back() {
    this.currentIndex = this.lastIndexes[this.currentLastViewedIndexInLastIndexes];
    if (this.currentLastViewedIndexInLastIndexes > 0) {
      this.currentLastViewedIndexInLastIndexes -= 1;
    }
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
  }

  prev() {
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex === 0 ? this.currentIndex = this.filteredImageDataArray.length - 1 : this.currentIndex = this.currentIndex - 1;
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
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
              // now make sure the new tag shows up as checked
              this.tagFlags[newTag.tagName] = true;
              this.newTag = null;
              this.tags.forEach(tag => { 
                this.shownTags[tag.tagName] = true;
              });
              this.applyTags();
            } else {
              console.log("No tagId came back from fileService.saveImage");
            }
          });
        }
      });
    }
    this.focusTagInput();
  }

  updateTagFromUI(checked, tagName: string) {
    console.log("updateTag - checked=" + checked + ", tagName=" + tagName);
    if (tagName) {
      this.tagFlags[tagName] = checked;
    }
    this.applyTags();
  }

  private updateTagsOnCurrentImage() {
    // first clear the existing tags on the image
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
    this.newTag = null;
    this.tags.forEach(tag => { 
      this.shownTags[tag.tagName] = true;
    });
    this.focusTagInput();
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
