import { ConfirmComponent } from './confirm/confirm.component';
import { AlertComponent } from './alert/alert.component';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
// Using this library: https://github.com/jesusbotella/ngx-lazy-load-images
import { LazyLoadImagesModule } from 'ngx-lazy-load-images';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { OpenTagsComponent } from './open-tags/open-tags.component';
import { GridViewComponent } from './grid-view/grid-view.component';
import { MainComponent } from './main/main.component';
import { DeleteImagesComponent } from './delete-images/delete-images.component';

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent,
    ConfirmComponent,
    OpenTagsComponent,
    GridViewComponent,
    MainComponent,
    DeleteImagesComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    NgbModule,
    LazyLoadImagesModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    OpenTagsComponent,
    ConfirmComponent, 
    AlertComponent,
    DeleteImagesComponent
  ]
})
export class AppModule { }
