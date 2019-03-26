import { Tag } from './tag';

export class ImageData {
    public id: number = -1;
    fullPath: string = null;
    fileName: string = null;
    filePath: string = null;
    exifData: any = null;
    tags: Tag[] = [];

    addTag(tag: Tag) {
        this.tags.push(tag);
    }
}