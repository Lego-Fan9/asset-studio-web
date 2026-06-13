import { StorageBlockFlags } from "../../../Enums/StorageBlockFlags.js";
import { EndianBinaryReader } from "../../../Util/EndianBinaryReader.js";

export class BundleStorageBlock {
    public compressedSize = 0;
    public uncompressedSize = 0;
    public flags: StorageBlockFlags = StorageBlockFlags.NotInitialized;

    constructor(reader?: EndianBinaryReader) {
        if (!reader) {
            return;
        }

        this.uncompressedSize = reader.ReadUint32();
        this.compressedSize = reader.ReadUint32();
        this.flags = reader.ReadUint16() as StorageBlockFlags;
    }
}