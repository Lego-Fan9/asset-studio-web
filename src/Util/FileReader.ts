import { EndianBinaryReader } from "./EndianBinaryReader.js"
import { FileType } from "../Enums/FileType.js"
import path from "../Util/path/index.js";

const GZipMagic = new Uint8Array([0x1f, 0x8b]);
const BrotliMagic = new Uint8Array([0x62, 0x72, 0x6F, 0x74, 0x6C, 0x69]);
const ZipMagic = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
const ZipSpannedMagic = new Uint8Array([0x50, 0x4B, 0x07, 0x08]);
const UnityFSMagic = new Uint8Array([0x55, 0x6E, 0x69, 0x74, 0x79, 0x46, 0x53, 0x00]);

export class FileReader extends EndianBinaryReader {
    public FullPath: string;
    public FileName: string;
    public FileType: FileType;
    private HeaderBuff: EndianBinaryReader;

    constructor(filepath: string, reader: EndianBinaryReader) {
        super(reader);

        this.HeaderBuff = new EndianBinaryReader(this.buffer.slice(0, 1152), this.endian)

        this.FullPath = path.resolve(filepath);
        this.FileName = path.basename(filepath);

        this.FileType = this.CheckFileType();
    }

    private CheckFileType(): FileType {
        const signature = this.HeaderBuff.ReadStringToNull(20);

        switch (signature) {
            case "UnityWeb":
            case "UnityRaw":
            case "UnityArchive":
            case "UnityWebData1.0":
            case "TuanjieWebData1.0":
                throw new Error("Unsupported file type");
            case "UnityFS":
                this.CheckBundleDataOffset();
                return FileType.BundleFile;
            default:
                const dataLen = this.HeaderBuff.view.byteLength;

                let magic = dataLen > 2 ? this.HeaderBuff.Slice(0, 2) : new Uint8Array();
                if (Uint8ArrayCompare(magic, GZipMagic)) {
                    return FileType.GZipFile;
                }

                magic = dataLen > 38 ? this.HeaderBuff.Slice(32, 6) : new Uint8Array();
                if (Uint8ArrayCompare(magic, BrotliMagic)) {
                    return FileType.BrotliFile;
                }

                if (this.IsSerializedFile()) {
                    return FileType.AssetsFile;
                }

                magic = dataLen > 4 ? this.HeaderBuff.Slice(0, 4) : new Uint8Array();
                if (Uint8ArrayCompare(magic, ZipMagic) || Uint8ArrayCompare(magic, ZipSpannedMagic)) {
                    return FileType.ZipFile;
                }

                if (this.CheckBundleDataOffset()) {
                    return FileType.BundleFile
                }

                return FileType.ResourceFile;
        }
    }

    private IsSerializedFile(): boolean {
        const fileSize = this.view.byteLength;

        if (fileSize < 20) {
            return false;
        }

        // let m_FileSize: BigInt = BigInt(this.HeaderBuff.ReadUint32At(4));
        let m_Version = this.HeaderBuff.ReadUint32At(8);
        let m_DataOffset: BigInt = BigInt(this.HeaderBuff.ReadUint32At(12));

        if (m_Version >= 22) {
            if (fileSize < 48) {
                return false;
            }

            // m_FileSize = this.HeaderBuff.ReadInt64At(12);
            m_DataOffset = this.HeaderBuff.ReadInt64At(32);
        }

        const BigIntFileSize: BigInt = BigInt(fileSize)
        if (m_DataOffset > BigIntFileSize) {
            return false;
        }

        return true;
    }

    private CheckBundleDataOffset(): boolean {
        var lastOffset = this.HeaderBuff.LastOffsetOf(UnityFSMagic);
        if (lastOffset <= 0) {
            return false;
        }

        var firstOffset = this.HeaderBuff.IndexOf(UnityFSMagic);
        if (firstOffset == lastOffset || lastOffset - firstOffset < 200) {
            this.offset = lastOffset;

            return true;
        }

        const tempOffset = this.HeaderBuff.offset;

        this.HeaderBuff.ReadStringToNull();
        this.HeaderBuff.ReadStringToNull();
        const bundleSize = this.HeaderBuff.ReadInt64();

        this.HeaderBuff.offset = tempOffset;

        if (bundleSize > 200n && BigInt(firstOffset) + bundleSize < BigInt(lastOffset)) {
            this.offset = firstOffset;

            return true;
        }

        return false;
    }
}

function Uint8ArrayCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }

    return true;
}