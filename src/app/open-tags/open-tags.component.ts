import { Component, OnInit } from '@angular/core';
import { Tag } from '../tag';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {FileService} from "src/app/file.service";

@Component({
  selector: 'img-open-tags',
  templateUrl: './open-tags.component.html',
  styleUrls: ['./open-tags.component.css']
})
export class OpenTagsComponent implements OnInit {
  newTag: string = null;
  tags: Tag[] = [];
  selectedTags: Tag[] = [];
  tagFlags: {[tagName:string]: boolean} = {};
  public set defaultSelected(defaultSelected: string[]) {
    defaultSelected.forEach((tagName: string) => {
      console.log("OpenTagsComponent.defaultSelected setter - setting tag: " + tagName + " to true");
      this.tagFlags[tagName] = true;
    });
  }

  constructor(public activeModal: NgbActiveModal, private fileService: FileService) { }

  ngOnInit() {
  }

  updateTagFromUI(checked, tagName: string) {
    console.log("updateTag - checked=" + checked + ", tagName=" + tagName);
    if (tagName) {
      this.tagFlags[tagName] = checked;
    }
  }

  handleSubmit() {
    this.tags.filter(tg => this.tagFlags[tg.tagName]).forEach(tg => this.selectedTags.push(tg));
    if (this.newTag && this.newTag.trim().length > 0) {
      this.fileService.saveTag(this.newTag.trim()).then(tagId => {
        console.log("OpenTagsComponent - Finished saving tag, here is the response: ");
        console.log(tagId);
        if (tagId) {
          let tag: Tag = new Tag();
          tag.tagName = this.newTag.trim();
          tag.id = parseInt(tagId);
          this.selectedTags.push(tag);
          console.log("OpenTagsComponent - Sending back new tag (and any selected existing tags):");
          console.log(this.selectedTags);
          this.activeModal.close(this.selectedTags);
        } else {
          console.log("OpenTagsComponent - No tagId came back from fileService.saveImage, sending back only selected tags (if any)...");
          this.activeModal.close(this.selectedTags);
        }
      }, () => {
        console.log("Error saving tag");
        this.activeModal.close([]);
      });
    } else {
      console.log("OpenTagsComponent - Sending back selected tags:");
      console.log(this.selectedTags);
      this.activeModal.close(this.selectedTags);
    }
  }
}
