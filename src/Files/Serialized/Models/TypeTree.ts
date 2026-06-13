import { TypeTreeNode } from "./TypeTreeNode.js"
import { FileReader } from "../../../Util/FileReader.js"
import { SerializedFileFormatVersion } from "./SerializedFileFormatVersion.js"
import { CommonStrings } from "./CommonStrings.js";

export class TypeTree {
    public m_Nodes: TypeTreeNode[] = [];
    public m_StringBuffer = new Uint8Array();

    public BlobRead(reader: FileReader, m_Version: SerializedFileFormatVersion) {
        const nodeCount = reader.ReadInt32();
        const stringBufferSize = reader.ReadInt32();

        for (let i = 0; i < nodeCount; i++) {
            const typeTreeNode = new TypeTreeNode();
            this.m_Nodes.push(typeTreeNode);

            typeTreeNode.m_Version = reader.ReadUint16();
            typeTreeNode.m_Level = reader.ReadByte();
            typeTreeNode.m_TypeFlags = reader.ReadByte();
            typeTreeNode.m_TypeStrOffset = reader.ReadUint32();
            typeTreeNode.m_NameStrOffset = reader.ReadUint32();
            typeTreeNode.m_ByteSize = reader.ReadInt32();
            typeTreeNode.m_Index = reader.ReadInt32();
            typeTreeNode.m_MetaFlag = reader.ReadInt32();

            if (m_Version >= SerializedFileFormatVersion.TypeTreeNodeWithTypeFlags) {
                typeTreeNode.m_RefTypeHash = reader.ReadUint64();
            }
        }

        this.m_StringBuffer = new Uint8Array(reader.ReadBytes(stringBufferSize));

        for (let i = 0; i < nodeCount; i++) {
            this.m_Nodes[i].m_Type = this.ReadString(this.m_StringBuffer, this.m_Nodes[i].m_TypeStrOffset);
            this.m_Nodes[i].m_Name = this.ReadString(this.m_StringBuffer, this.m_Nodes[i].m_TypeStrOffset);
        }
    }

    private ReadString(bytes: Uint8Array, value: number): string {
        const isOffset = (value & 0x80000000) === 0;
        if (isOffset) {
            return this.ReadNullTerminatedString(bytes, value);
        }

        const offset = value & 0x7FFFFFFF;
        const str = CommonStrings.get(offset);
        if (str !== undefined) {
            return str;
        }

        return offset.toString();
    }

    private ReadNullTerminatedString(bytes: Uint8Array, offset: number): string {
        const start = offset;
        while (bytes[offset] !== 0) {
            offset++;
        }

        return new TextDecoder().decode(bytes.slice(start, offset));
    }

    public ReadTypeTree(reader: FileReader, m_Version: SerializedFileFormatVersion, level: number = 0) {
        const typeTreeNode = new TypeTreeNode();
        this.m_Nodes.push(typeTreeNode);

        typeTreeNode.m_Level = level;
        typeTreeNode.m_Type = reader.ReadStringToNull();
        typeTreeNode.m_Name = reader.ReadStringToNull();
        typeTreeNode.m_ByteSize = reader.ReadInt32();

        if (m_Version == SerializedFileFormatVersion.Unknown_2) {
            reader.ReadInt32();
        }

        if (m_Version != SerializedFileFormatVersion.Unknown_3) {
            typeTreeNode.m_Index = reader.ReadInt32();
        }

        typeTreeNode.m_TypeFlags = reader.ReadInt32();
        typeTreeNode.m_Version = reader.ReadInt32();

        if (m_Version != SerializedFileFormatVersion.Unknown_3) {
            typeTreeNode.m_MetaFlag = reader.ReadInt32();
        }

        const childCount = reader.ReadInt32();
        for (let i = 0; i < childCount; i++) {
            this.ReadTypeTree(reader, m_Version, ++level);
        }
    }
}