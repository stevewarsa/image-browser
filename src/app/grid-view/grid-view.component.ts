import { Component, OnInit } from '@angular/core';
import { FileService } from '../file.service';
import { ModalHelperService } from '../modal-helper.service';
import { Router } from '@angular/router';
import { ImageData } from '../image-data';

@Component({
  selector: 'img-grid-view',
  templateUrl: './grid-view.component.html',
  styleUrls: ['./grid-view.component.css']
})
export class GridViewComponent implements OnInit {
  filteredImageDataArray: ImageData[] = [];
  imageDataArray: ImageData[] = [];
  busy: boolean = false;
  busyMessage: string = null;

  constructor(private fileService: FileService, private modalHelperService: ModalHelperService, private route: Router) { }

  ngOnInit() {
    this.busy = true;
    this.busyMessage = "Retrieving all images from file service...";
    this.filteredImageDataArray = this.fileService.filteredImageDataArray;
    this.imageDataArray = this.fileService.imageDataArray;
    this.busy = false;
    this.busyMessage = null;
  }

  back() {
    this.route.navigate([''])
  }
}
