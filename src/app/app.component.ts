import { Component, OnInit } from '@angular/core';
import { FileService } from './file.service';

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

  constructor(private fileService: FileService) { }

  ngOnInit() {
    this.busy = true;
    this.busyMessage = "Retrieving all the images ...";
    let dirPath = "C:/backup/pictures";
    this.fileService.getFiles(dirPath).then((files: string[]) => {
      this.filesFound = files;
      for (let i = 0; i < this.filesFound.length; i++) {
        let file = this.filesFound[i];
        //console.log("File found: " + file);
        if (i % 10 == 0) {
          console.log("Updating UI with file found: " + file);
          this.currentFile = file;
          this.busyMessage = "Processing file " + (i + 1) + " of " + this.filesFound.length + " files...";
        // setTimeout(() => {
        //   }, 100);
        }
      }
      this.busy = false;
      this.busyMessage = null;
    });
  }
}
