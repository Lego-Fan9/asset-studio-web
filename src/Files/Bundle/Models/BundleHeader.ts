import { UnityVersion } from "../../../Util/UnityVersions.js";
import { ArchiveFlags } from "../../../Enums/ArchiveFlags.js"
import { FileReader } from "../../../Util/FileReader.js";

export class BundleHeader {
    public signature = "";
    public version = 0;
    public unityVersion = "";
    public unityRevision = new UnityVersion();
    public size = 0n;
    public compressedBlocksInfoSize = 0;
    public uncompressedBlocksInfoSize = 0;
    public flags: ArchiveFlags = ArchiveFlags.NotInitialized;

    public ReadHeader(reader: FileReader) {
        this.signature = reader.ReadStringToNull();
        this.version = reader.ReadUint32();
        this.unityVersion = reader.ReadStringToNull();
        this.unityRevision = new UnityVersion(reader.ReadStringToNull())
    }

    public ReadHeader2(reader: FileReader) {
        this.size = reader.ReadInt64();
        this.compressedBlocksInfoSize = reader.ReadUint32();
        this.uncompressedBlocksInfoSize = reader.ReadUint32();
        this.flags = reader.ReadUint32() as ArchiveFlags;
        if (this.signature != "UnityFS") {
            reader.ReadByte();
        }
    }
}