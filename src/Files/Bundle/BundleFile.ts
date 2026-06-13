import { BundleHeader } from "./Models/BundleHeader.js";
import { BundleNode } from "./Models/BundleNode.js";
import { BundleStorageBlock } from "./Models/BundleStorageBlock.js";
import { StreamFile } from "../StreamFile.js";
import { FileReader } from "../../Util/FileReader.js";
import { EndianBinaryReader } from "../../Util/EndianBinaryReader.js";
import { ArchiveFlags } from "../../Enums/ArchiveFlags.js"
import { CompressionType } from "../../Enums/CompressionType.js";
import { StorageBlockFlags } from "../../Enums/StorageBlockFlags.js";
import { Decompress } from "../../Decompression/Decompression.js"
import path from "../../Util/path/index.js";

export class BundleFile {
    public readonly IsDataAfterBundle: boolean;
    public m_Header: BundleHeader;
    private m_BlocksInfo: BundleStorageBlock[] = [];
    private m_DirectoryInfo: BundleNode[] = [];
    public fileList: StreamFile[] = [];

    constructor(reader: FileReader, isMultiBundle: boolean = false) {
        this.m_Header = new BundleHeader();
        this.m_Header.ReadHeader(reader);

        switch (this.m_Header.signature) {
            case "UnityFS":
                this.m_Header.ReadHeader2(reader);

                console.log(this.m_Header);

                if (this.m_Header.size > reader.view.byteLength) {
                    throw new Error(`Bundle size is wrong. Header claims ${this.m_Header.size}, reader is ${reader.view.byteLength}`);
                }

                this.IsDataAfterBundle = BigInt(reader.view.byteLength) - this.m_Header.size > 200;

                this.UnityCnCheck(reader);

                this.ReadBlocksInfoAndDirectory(reader);

                if (this.IsUncompressedBundle() && !this.IsDataAfterBundle && !isMultiBundle) {
                    this.ReadFiles(reader.buffer, reader.offset);
                }

                this.ReadFiles(this.ReadBlocks(reader));

                break;
            default:
                throw new Error(`Cannot decompress bundle for ${this.m_Header.signature}`);
        }
    }

    private ReadBlocksInfoAndDirectory(reader: FileReader) {
        if (this.m_Header.version >= 7) {
            reader.AlignStream(16);
        } else if (this.m_Header.unityRevision.compareTo([2019, 4]) >= 0 && this.m_Header.flags != ArchiveFlags.BlocksAndDirectoryInfoCombined) {
            const preAlign = reader.offset;
            const alignData = reader.ReadBytes((16 - Math.trunc((preAlign % 16))) % 16);

            if (alignData.some(x => x !== 0)) {
                reader.offset = preAlign;
            }
        }

        if (this.m_Header.uncompressedBlocksInfoSize < 0 || this.m_Header.compressedBlocksInfoSize < 0 || this.m_Header.compressedBlocksInfoSize > reader.view.byteLength) {
            throw new Error("BlockInfo is wrong. Encryption?");
        }

        let blocksInfoBytes = new Uint8Array();

        if ((this.m_Header.flags & ArchiveFlags.BlocksInfoAtTheEnd) != 0) {
            const pos = reader.offset;

            reader.offset = Number(this.m_Header.size - BigInt(this.m_Header.compressedBlocksInfoSize));
            blocksInfoBytes = new Uint8Array(reader.ReadBytes(Number(this.m_Header.compressedBlocksInfoSize)));

            reader.offset = pos;
        } else {
            blocksInfoBytes = new Uint8Array(reader.ReadBytes(Number(this.m_Header.compressedBlocksInfoSize)));
        }

        let numWrite = 0;
        let blocksInfoUncompressedStream = new Uint8Array(0);
        const compressionType = (this.m_Header.flags & ArchiveFlags.CompressionTypeMask) as CompressionType
        switch (compressionType) {
            case CompressionType.None:
                blocksInfoUncompressedStream = new Uint8Array(blocksInfoBytes);
                numWrite = this.m_Header.compressedBlocksInfoSize;
                break;
            case CompressionType.Lzma:
            case CompressionType.Lz4:
            case CompressionType.Lz4HC:
                blocksInfoUncompressedStream = new Uint8Array(this.m_Header.uncompressedBlocksInfoSize);
                numWrite = Decompress(blocksInfoBytes, blocksInfoUncompressedStream, compressionType, this.m_Header.uncompressedBlocksInfoSize);
                break;
            default:
                throw new Error(`Not handled compression: ${compressionType}`);
        }

        if (numWrite != this.m_Header.uncompressedBlocksInfoSize) {
            throw new Error(`Failed to decompress. Got ${numWrite}, expected ${this.m_Header.uncompressedBlocksInfoSize}`);
        }

        let blocksInfoReader = new EndianBinaryReader(blocksInfoUncompressedStream.buffer);

        blocksInfoReader.ReadBytes(16);

        const blocksInfoCount = blocksInfoReader.ReadInt32();
        this.m_BlocksInfo = new Array(blocksInfoCount);

        for (let i = 0; i < blocksInfoCount; i++) {
            this.m_BlocksInfo[i] = new BundleStorageBlock(blocksInfoReader);
        }

        console.log(this.m_BlocksInfo);

        const nodesCount = blocksInfoReader.ReadInt32();
        this.m_DirectoryInfo = new Array(nodesCount);

        for (let i = 0; i < nodesCount; i++) {
            this.m_DirectoryInfo[i] = new BundleNode(blocksInfoReader);
        }

        console.log(this.m_DirectoryInfo);

        if ((this.m_Header.flags & ArchiveFlags.BlockInfoNeedPaddingAtStart) != 0) {
            reader.AlignStream(16);
        }
    }

    private UnityCnCheck(_: FileReader) {
        return;
    }

    private IsUncompressedBundle(): boolean {
        return this.m_BlocksInfo.every(
            x => ((x.flags & StorageBlockFlags.CompressionTypeMask) as CompressionType)
                === CompressionType.None
        );
    }

    private ReadBlocks(reader: FileReader): ArrayBuffer {
        let chunks: Uint8Array[] = []

        for (let i = 0; i < this.m_BlocksInfo.length; i++) {
            const blockInfo = this.m_BlocksInfo[i];

            const compressionType = (blockInfo.flags & StorageBlockFlags.CompressionTypeMask) as CompressionType;
            let numWrite = 0;
            switch (compressionType) {
                case CompressionType.None:
                    chunks.push(reader.ReadBytes(blockInfo.compressedSize));
                    numWrite += blockInfo.compressedSize;

                    break;
                case CompressionType.Lzma:
                case CompressionType.Lz4:
                case CompressionType.Lz4HC:
                    let compressedBuff = new Uint8Array(blockInfo.compressedSize);
                    let uncompressedBuff = new Uint8Array(blockInfo.uncompressedSize);

                    reader.ReadBytes(blockInfo.compressedSize, compressedBuff);

                    numWrite = Decompress(compressedBuff, uncompressedBuff, compressionType, blockInfo.uncompressedSize);

                    if (numWrite !== blockInfo.uncompressedSize) {
                        console.error(`Decompression error. Expected ${blockInfo.uncompressedSize} got ${numWrite}`);
                    }

                    chunks.push(uncompressedBuff);
                    
                    break;
                default:
                    console.warn(`Cannot decompress block type: ${compressionType}`);
            }
        }

        const blocksUncompressedSize = this.m_BlocksInfo.reduce((sum, x) => sum + x.uncompressedSize, 0);
        let blockStream = new Uint8Array(blocksUncompressedSize)
        let offset = 0;
        for (const chunk of chunks) {
            blockStream.set(chunk, offset);
            offset += chunk.length;
        }

        return blockStream.buffer;
    }

    private ReadFiles(buffer: ArrayBuffer, blocksOffset: number = 0) {
        for (const node of this.m_DirectoryInfo) {
            const fileName = path.basename(node.path)
            
            const start = Number(node.offset) + blocksOffset;
            const fileBuffer = buffer.slice(start, start + Number(node.size));
            const stream = new EndianBinaryReader(fileBuffer);

            if (stream.isAllZero()) {
                console.warn(`${fileName} ${node.path} is all zero`);
            }

            let file = new StreamFile(node.path, fileName, stream);
            this.fileList.push(file);
        }
    }
}