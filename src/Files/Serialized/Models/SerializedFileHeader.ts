import { SerializedFileFormatVersion } from "./SerializedFileFormatVersion.js"
import { FileReader } from "../../../Util/FileReader.js"

export class SerializedFileHeader {
    public m_MetadataSize = 0;
    public m_FileSize = 0n;
    public m_Version = SerializedFileFormatVersion.Unsupported;
    public m_DataOffset = 0n;
    public m_Endianess = 0;
    public m_Reserved = new Uint8Array();

    public ReadHeader(reader: FileReader) {
        this.m_MetadataSize = reader.ReadUint32();
        this.m_FileSize = BigInt(reader.ReadUint32());
        this.m_Version = reader.ReadUint32();
        this.m_DataOffset = BigInt(reader.ReadUint32());

        if (this.m_Version >= SerializedFileFormatVersion.Unknown_9) {
            this.m_Endianess = reader.ReadByte();
            this.m_Reserved = new Uint8Array(reader.ReadBytes(3));
        } else {
            reader.offset = Number(this.m_FileSize - BigInt(this.m_MetadataSize))
            this.m_Endianess = reader.ReadByte();
        }

        if (this.m_Version >= SerializedFileFormatVersion.LargeFilesSupport) {
            this.m_MetadataSize = reader.ReadUint32();
            this.m_FileSize = reader.ReadUint64();
            this.m_DataOffset = reader.ReadUint64();
            reader.ReadInt64();
        }
    }
}