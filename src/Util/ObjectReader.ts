import { EndianBinaryReader } from "./EndianBinaryReader.js";
import { SerializedFile } from "../Files/Serialized/SerializedFile.js"
import { SerializedType } from "../Files/Serialized/Models/SerializedType.js"
import { SerializedFileFormatVersion } from "../Files/Serialized/Models/SerializedFileFormatVersion.js"
import { ObjectInfo } from "../Files/Serialized/Models/ObjectInfo.js"
import { BuildTarget } from "../Enums/BuildTarget.js";
import { ClassIDType } from "../Enums/ClassIDType";
import { UnityVersion } from "./UnityVersions.js";

export class ObjectReader extends EndianBinaryReader {
    public assetsFile: SerializedFile;
    public m_PathID = 0n;
    public byteStart = 0n;
    public byteSize = 0;
    public classID = 0;
    public type: ClassIDType;
    public serializedType: SerializedType;
    public platform: BuildTarget;
    public m_Version: SerializedFileFormatVersion;
    public version: UnityVersion;

    constructor(reader: EndianBinaryReader, assetsFile: SerializedFile, objectInfo: ObjectInfo) {
        super(reader.buffer, reader.endian);
        this.offset = Number(objectInfo.byteStart);
        this.baseOffset = Number(objectInfo.byteStart);
        this.length = objectInfo.byteSize;

        this.assetsFile = assetsFile
        this.m_PathID = objectInfo.m_PathID;
        this.byteStart = objectInfo.byteStart;
        this.byteSize = objectInfo.byteSize;
        this.classID = objectInfo.classID;
        this.type = objectInfo.classID in ClassIDType ? objectInfo.classID as ClassIDType : ClassIDType.UnknownType;
        this.serializedType = objectInfo.serializedType;
        this.platform = assetsFile.m_TargetPlatform;
        this.m_Version = assetsFile.header.m_Version;
        this.version = assetsFile.version;
    }
}