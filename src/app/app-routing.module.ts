import { MainComponent } from './main/main.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GridViewComponent } from './grid-view/grid-view.component';
import {SimpleViewComponent} from "src/app/simple-view/simple-view.component";

const routes: Routes = [
  {path: '', component: SimpleViewComponent},
  {path: 'main', component: MainComponent},
  {path: 'grid', component: GridViewComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
