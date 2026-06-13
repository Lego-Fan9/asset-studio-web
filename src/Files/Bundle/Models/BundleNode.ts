import { EndianBinaryReader } from "../../../Util/EndianBinaryReader.js";

export class BundleNode {
    public offset = 0n;
    public size = 0n;
    public flags = 0;
    public path = "";

    constructor(reader?: EndianBinaryReader) {
        if (!reader) {
            return;
        }

        this.offset = reader.ReadInt64();
        this.size = reader.ReadInt64();
        this.flags = reader.ReadUint32();
        this.path = reader.ReadStringToNull();
    }
}