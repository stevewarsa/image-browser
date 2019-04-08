import { ConfirmComponent } from './confirm/confirm.component';
import { AlertComponent } from './alert/alert.component';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { OpenTagsComponent } from './open-tags/open-tags.component';
import { LazyLoadDirective } from './lazy-load.directive';
import { GridViewComponent } from './grid-view/grid-view.component';
import { MainComponent } from './main/main.component';

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent,
    ConfirmComponent,
    OpenTagsComponent,
    LazyLoadDirective,
    GridViewComponent,
    MainComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    NgbModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    OpenTagsComponent,
    ConfirmComponent, 
    AlertComponent
  ]
})
export class AppModule { }
