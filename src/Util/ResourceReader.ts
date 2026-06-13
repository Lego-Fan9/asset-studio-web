import { ObjectReader } from "./ObjectReader.js";
import { EndianBinaryReader } from "./EndianBinaryReader.js";
import path from "./path/index.js";

export class ResourceReader {
    private objectReader: ObjectReader;
    private needSearch: boolean;
    private resReader: EndianBinaryReader | null = null;

    public path: string;
    public size: number;
    public offset: number;

    constructor(reader: ObjectReader, size: number, offset: number, path: string, objReaderIsRes: boolean = false) {
        this.objectReader = reader;
        this.needSearch = true;
        this.path = path;
        this.size = size;
        this.offset = offset;

        if (objReaderIsRes) {
            this.resReader = reader;
            this.needSearch = false;
            this.size = reader.view.byteLength;
            this.offset = 0;
        }
    }

    private GetReader() {
        if (!this.needSearch) {
            return
        }

        const resFileName = path.basename(this.path);
        const resFile = this.objectReader.assetsFile.assetsManager.resourceReaders.get(resFileName);
        if (resFile !== undefined) {
            this.resReader = resFile;
            this.needSearch = false;

            return;
        }
    }

    public GetData(): Uint8Array | null {
        this.GetReader();

        console.log(`Reading data from resS`);
        console.log(this);

        if (this.resReader === null) {
            return null;
        }

        this.resReader.offset = this.offset;

        return this.resReader.ReadBytes(this.size);
    }
}