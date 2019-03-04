import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'img-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = "Image Browser";
  fs = null;

  constructor(private electronService: ElectronService) {
    this.fs = this.electronService.remote.require('fs');
  }

  launchWindow() {
    //this.electronService.shell.openExternal("http://ps11911.com");
    //this.electronService.remote.dialog.showOpenDialog({});
    let dirPath = "C:/backup/pictures";
    this.fs.readdir(dirPath, (err, dir) => {
      for (let i = 0; i < dir.length; i++) {
          let fileName = dir[i];
          let filePath = dirPath + "/" + fileName;
          let stat = this.fs.statSync(filePath);
          if (stat.isFile()) {
            console.log("File: " + filePath);
            // this.fs.readFile(filePath, 'utf8', (err,data) => {
            //     if (err) {
            //         console.log(err);
            //     }
            //     console.log("C: "+ fileName);
            // });
          } else {
            console.log("Directory: " + filePath);
          }
      }
    });
  }
}
