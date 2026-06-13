import { ObjectReader } from "../Util/ObjectReader.js";
import { SerializedFile } from "../Files/Serialized/SerializedFile.js";
import { SerializedType } from "../Files/Serialized/Models/SerializedType.js";
import { UnityVersion } from "../Util/UnityVersions.js";
import { BuildTarget } from "../Enums/BuildTarget.js";
import { ClassIDType } from "../Enums/ClassIDType.js"

export class UnityObject {
    public assetsFile: SerializedFile;
    public reader: ObjectReader;
    public m_PathID: BigInt;
    public version: UnityVersion;
    public platform: BuildTarget;
    public type: ClassIDType;
    public serializedType: SerializedType;
    public classID: number;
    public byteSize: number;

    constructor(reader: ObjectReader) {
        this.reader = reader;
        this.assetsFile = reader.assetsFile;
        this.type = reader.type;
        this.m_PathID = reader.m_PathID;
        this.version = reader.version;
        this.platform = reader.platform;
        this.serializedType = reader.serializedType;
        this.classID = reader.classID;
        this.byteSize = reader.byteSize;

        if (this.platform === BuildTarget.NoTarget) {
            reader.ReadUint32(); // m_ObjectHideFlags
        }
    }
}