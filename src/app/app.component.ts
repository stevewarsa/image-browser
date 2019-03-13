import { Component, OnInit } from '@angular/core';
import { FileService } from './file.service';
import { ImageData } from './image-data';

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

  constructor(private fileService: FileService) { }

  ngOnInit() {
    this.busy = true;
    this.busyMessage = "Retrieving all the images ...";
    let dirPath = "C:/backup/pictures";
    this.fileService.getFiles(dirPath).then((files: string[]) => {
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
      console.log("Got image metadata back for path:" + this.filesFound[this.currentIndex]);
      this.currentMetaData = imageData;
      console.log(this.currentMetaData);
    })
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

  private scroll(id) {
    console.log(`scrolling to ${id + 1}`);
    let el = document.getElementById(id + 1);
    if (el) {
      el.scrollIntoView();
    }
  }
}
