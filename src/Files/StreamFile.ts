import { EndianBinaryReader } from "../Util/EndianBinaryReader.js"

export class StreamFile {
    public path = "";
    public fileName = "";
    public stream: EndianBinaryReader;

    constructor(path: string, fileName: string, stream: EndianBinaryReader) {
        this.path = path;
        this.fileName = fileName;
        this.stream = stream;
    }
}