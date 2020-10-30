import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FileService } from '../file.service';
import { ImageData } from '../image-data';
import { Tag } from '../tag';
import { ModalHelperService } from '../modal-helper.service';
import { Router } from '@angular/router';

@Component({
  selector: 'img-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  mode = "simple"; // or advanced
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
  showAddTagForm: boolean = false;
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

  constructor(private fileService: FileService, private modalHelperService: ModalHelperService, private route: Router) { }

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
          this.shownTagsForFilterTags[tag.tagName] = true;
          this.shownTagsForExcludeTags[tag.tagName] = true;
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
          this.shownTagsForFilterTags[tag.tagName] = true;
          this.shownTagsForExcludeTags[tag.tagName] = true;
          this.tagNames.push(tag.tagName.toUpperCase());
        });
        
        this.next();
        this.busy = false;
        this.busyMessage = null;
      });
    }
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
    if (!this.filteredImageDataArray || this.filteredImageDataArray.length === 0) {
      // display message and then put the image array back to all images & reset the filter flags
      this.modalHelperService.alert({message: "There were no images found matching the selected filters.  Resetting filters.", header: "No Images Found"}).result.then(() => {
        console.log("Message displayed...");
      });
      this.showForm = false;
      this.showExcludeForm = false;
      this.clearFilters();
    } else {
      this.showForm = false;
      this.showExcludeForm = false;
      this.currentIndex = -1;
      this.next();
    }
  }

  filterToImagesWithoutTags() {
    this.filteredImageDataArray = this.imageDataArray.filter((img: ImageData) => img.id === -1 && (img.tags === null || img.tags.length === 0));
    this.showForm = false;
    this.currentIndex = -1;
    this.next();
  }

  findDups() {
    let dups: {[fileName: string]: ImageData[]} = {};
    this.filteredImageDataArray.forEach(img => dups[img.fileName] ? dups[img.fileName].push(img) : dups[img.fileName] = [img]);
    let temp = this.filteredImageDataArray.filter(img => dups[img.fileName].length > 1);
    if (temp && temp.length > 0) {
      this.filteredImageDataArray = temp;
      this.currentIndex = -1;
      this.next();
    } else {
      this.modalHelperService.alert({message: "No duplicates where found for the selected image set"});
    }
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
    //this.filterTagInputInForm.nativeElement.value = "";
    //this.filterTagsForFilter("");
    this.focusFilterTagInFormInput();
    this.filterImages();
  }

  selectTagForExclude(checked: boolean, tagName: string) {
    console.log("Setting exclusion tag " + tagName + " to " + (checked ? "Selected" : "Unselected") + "...");
    this.excludeImageFlags[tagName] = checked;
    //this.excludeTagInputInForm.nativeElement.value = "";
    //this.filterTagsForExclude("");
    this.focusExcludeTagInFormInput();
    this.filterImages();
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

  viewAddTagForm() {
    this.showAddTagForm = true;
    this.focusTagInput();
  }

  getImageDetails() {
    this.fileService.getImageDetails(this.filteredImageDataArray[this.currentIndex].fullPath).then(response => {
      console.log("AppComponent.getImageDetails - response: ");
      console.log(response);
    })
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

  focusFilterTagInFormInput() {
    setTimeout(() => {
      this.filterTagInputInForm.nativeElement.focus();
      this.filterTagInputInForm.nativeElement.select();
    }, 300);
  }

  focusExcludeTagInFormInput() {
    setTimeout(() => {
      this.excludeTagInputInForm.nativeElement.focus();
      this.excludeTagInputInForm.nativeElement.select();
    }, 300);
  }

  doRandom() {
    console.log("Entering doRandom()...");
    let randNum: number = Math.floor(Math.random() * (this.filteredImageDataArray.length - 1));
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex = randNum;
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
  }

  next() {
    console.log("Entering next()...");
    this.lastIndexes.push(this.currentIndex);
    this.currentLastViewedIndexInLastIndexes = this.lastIndexes.length - 1;
    this.currentIndex === (this.filteredImageDataArray.length - 1) ? this.currentIndex = 0 : this.currentIndex = this.currentIndex + 1;
    this.currentMetaData = this.filteredImageDataArray[this.currentIndex];
    this.updateUiAfterNavigate();
  }

  gridView() {
    //console.log("Grid View clicked");
    this.fileService.filteredImageDataArray = this.filteredImageDataArray;
    this.fileService.imageDataArray = this.imageDataArray;
    this.route.navigate(['grid']);
  }

  private updateUiAfterNavigate() {
    console.log("Entering updateUiAfterNavigate...");
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
    this.ourCamera = false;
    this.fileService.getImageDetailsSync(this.currentMetaData.fullPath).then(response => {
      if (response && response.exif) {
        console.log("app.component-Received EXIF response...");
        this.currentMetaData.exifData = response;
        if (this.currentMetaData.exifData.image && this.currentMetaData.exifData.image.Make && this.currentMetaData.exifData.image.Model) {
          let ourMakes = ['EASTMAN KODAK COMPANY', 'Research In Motion', 'HTC', 'Motorola', 'motorola', 'Motorola\u0000', 'HP', 'NIKON'];
          let ourModels = ['KODAK DX6340 ZOOM DIGITAL CAMERA', 'BlackBerry 8330', 'PC36100', 'DROID RAZR HD', 'HTC6525LVW', 'XT1635-01', 'HP psc1600', 'BlackBerry 9310', 'COOLPIX S33'];
          this.ourCamera = ourMakes.includes(this.currentMetaData.exifData.image.Make) && ourModels.includes(this.currentMetaData.exifData.image.Model);
          // check to see if our camera took the picture and there is no tag 'Pictures Taken By Steve or Tina' present
          if (this.ourCamera && this.currentMetaData.tags.filter((tag: Tag) => tag.id === 26).length < 1) {
            this.addOurPictureTag();
          }
        }
      }
    });
    this.newTag = null;
    this.tags.forEach(tag => { 
      this.shownTags[tag.tagName] = true;
    });
    this.focusTagInput();
  }

  private focusTagInput() {
    if (!this.showAddTagForm) {
      // only focus this field if the add tags form is shown
      return;
    }
    setTimeout(() => {
      this.tagInput.nativeElement.focus();
      this.tagInput.nativeElement.select();
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

  private addOurPictureTag() {
    let ourPictureTagName: string = this.tags.filter((tag: Tag) => tag.id === 26)[0].tagName;
    this.tagFlags[ourPictureTagName] = true;
    this.applyTags();
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
    // this.newTag = null;
    // this.tags.forEach(tag => { 
    //   this.shownTags[tag.tagName] = true;
    // });
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
