import { Component, OnInit } from '@angular/core';
import { Tag } from '../tag';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'img-open-tags',
  templateUrl: './open-tags.component.html',
  styleUrls: ['./open-tags.component.css']
})
export class OpenTagsComponent implements OnInit {
  tags: Tag[] = [];
  selectedTags: Tag[] = [];
  tagFlags: {[tagName:string]: boolean} = {};
  public set defaultSelected(defaultSelected: string[]) {
    defaultSelected.forEach((tagName: string) => {
      console.log("OpenTagsComponent.defaultSelected setter - setting tag: " + tagName + " to true");
      this.tagFlags[tagName] = true;
    });
  }

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  updateTagFromUI(checked, tagName: string) {
    console.log("updateTag - checked=" + checked + ", tagName=" + tagName);
    if (tagName) {
      this.tagFlags[tagName] = checked;
    }
  }

  handleSubmit() {
    this.tags.forEach(tg => {
      if (this.tagFlags[tg.tagName]) {
        this.selectedTags.push(tg);
      }
    });
    console.log("OpenTagsComponent - Sending back selected tags:");
    console.log(this.selectedTags);
    this.activeModal.close(this.selectedTags);
  }
}
