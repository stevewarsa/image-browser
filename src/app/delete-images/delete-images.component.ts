import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FileService } from '../file.service';
import { ImageData } from '../image-data';

@Component({
  selector: 'img-delete-images',
  templateUrl: './delete-images.component.html'
})
export class DeleteImagesComponent implements OnInit {
  imageArray: ImageData[] = [];
  busy = false;
  busyMessage = null;
  errorMessages: string[] = [];
  confirm = false;

  constructor(private fileService: FileService, public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  doDelete() {
    this.errorMessages = [];
    this.busy = true;
    this.busyMessage = "Deleting images...";
    for (let img of this.imageArray) {
      this.fileService.deleteFile(img.fullPath).then((response: string) => {
        if (response.startsWith("Error")) {
          this.errorMessages.push(response);
        } else {
          // response was successful, so now delete the image out of the database as well (including deleting assoc tags)...
          let messages:string[] = this.fileService.deleteImage(img.id);
          console.log("Here are the messages back from the 2 operations:");
          console.log(messages);
        }
      });
    }
    this.busy = false;
    this.busyMessage = null;
    if (this.errorMessages.length === 0) {
      this.activeModal.close(this.imageArray);
    }
  }
}
