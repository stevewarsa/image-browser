"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ImageData = /** @class */ (function () {
    function ImageData() {
        this.id = -1;
        this.fullPath = null;
        this.fileName = null;
        this.filePath = null;
        this.tags = [];
    }
    ImageData.prototype.addTag = function (tag) {
        this.tags.push(tag);
    };
    return ImageData;
}());
exports.ImageData = ImageData;
//# sourceMappingURL=image-data.js.map