"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ImageData = /** @class */ (function () {
    function ImageData() {
        this.id = -1;
        this.fullPath = null;
        this.fileName = null;
        this.filePath = null;
        this._tags = [];
    }
    ImageData.prototype.addTag = function (tag) {
        this._tags.push(tag);
    };
    Object.defineProperty(ImageData.prototype, "tags", {
        get: function () {
            return this._tags;
        },
        set: function (tags) {
            this._tags = tags;
        },
        enumerable: true,
        configurable: true
    });
    return ImageData;
}());
exports.ImageData = ImageData;
//# sourceMappingURL=image-data.js.map