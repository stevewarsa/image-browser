import { Tag } from './tag';

export class ImageData {
    public id: number = -1;
    fullPath: string = null;
    fileName: string = null;
    filePath: string = null;
    private _tags: Tag[] = [];

    addTag(tag: Tag) {
        this._tags.push(tag);
    }

    public get tags(): Tag[] {
        return this._tags;
    }

    public set tags(tags: Tag[]) {
        this._tags = tags;
    }
}