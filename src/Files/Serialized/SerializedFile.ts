import { FileReader } from "../../Util/FileReader.js";
import { UnityVersion } from "../../Util/UnityVersions.js";
import { SerializedFileHeader } from "./Models/SerializedFileHeader.js";
import { SerializedType } from "./Models/SerializedType.js";
import { SerializedFileFormatVersion } from "./Models/SerializedFileFormatVersion.js";
import { TypeTree } from "./Models/TypeTree.js"
import { ObjectInfo } from "./Models/ObjectInfo.js";
import { LocalSerializedObjectIdentifier } from "./Models/LocalSerializedObjectIdentifier.js";
import { FileIdentifier } from "./Models/FileIdentifier.js";
import { EndianType } from "../../Enums/Endian.js";
import { BuildTarget } from "../../Enums/BuildTarget.js";
import { UnityObject } from "../../Classes/Object.js";
import { AssetsManager } from "../../AssetsManager.js";

export class SerializedFile {
    public reader: FileReader;
    public assetsManager: AssetsManager;
    public originalPath = "";

    public header: SerializedFileHeader;
    public version = new UnityVersion();
    public bigIDEnabled = 0;

    public m_TargetPlatform = BuildTarget.UnknownPlatform;
    public m_EnableTypeTree = false;
    public m_Types: SerializedType[] = [];
    public m_Objects: ObjectInfo[] = [];
    public m_ScriptTypes: LocalSerializedObjectIdentifier[] = [];
    public m_Externals: FileIdentifier[] = [];
    public m_RefTypes: SerializedType[] = [];
    public userInformation = "";

    public ObjectMap = new Map<BigInt, UnityObject>()
    public ObjectList: UnityObject[] = [];

    constructor(reader: FileReader, assetsManager: AssetsManager) {
        this.reader = reader
        this.assetsManager = assetsManager;

        this.header = new SerializedFileHeader();
        this.header.ReadHeader(this.reader);

        if (this.header.m_Endianess == 0) {
            this.reader.endian = EndianType.LittleEndian;
        } else {
            this.reader.endian = EndianType.BigEndian;
        }

        this.ReadMetadata();
        this.ReadTypes();

        if (this.header.m_Version >= SerializedFileFormatVersion.Unknown_7 && this.header.m_Version < SerializedFileFormatVersion.Unknown_14) {
            this.bigIDEnabled = reader.ReadInt32();
        }

        this.ReadObjects();
        this.ReadScriptTypes();
        this.ReadExternals();
        this.ReadRefTypes();

        if (this.header.m_Version >= SerializedFileFormatVersion.Unknown_5) {
            this.userInformation = this.reader.ReadStringToNull();
        }
    }

    private ReadMetadata() {
        if (this.header.m_Version >= SerializedFileFormatVersion.Unknown_7) {
            const versionString = this.reader.ReadStringToNull();
            const result = UnityVersion.tryParse(versionString);
            if (!result.success || result.value === null) {
                throw new Error("Failed to read unity version: " + versionString);
            }

            this.version = result.value;
        } else {
            this.version = new UnityVersion(2, 5, 0);
        }

        if (this.header.m_Version >= SerializedFileFormatVersion.Unknown_8) {
            this.m_TargetPlatform = this.reader.ReadInt32();
        }

        if (this.header.m_Version >= SerializedFileFormatVersion.HasTypeTreeHashes) {
            this.m_EnableTypeTree = this.reader.ReadByte() !== 0;
        }
    }

    private ReadTypes() {
        const count = this.reader.ReadInt32();
        for (let i = 0; i < count; i++) {
            this.m_Types.push(this.ReadSerializedType(false));
        }
    }

    private ReadSerializedType(isRef: boolean): SerializedType {
        let type = new SerializedType()

        type.classID = this.reader.ReadInt32();

        if (this.header.m_Version >= SerializedFileFormatVersion.RefactoredClassId) {
            type.m_IsStrippedType = this.reader.ReadByte() !== 0;
        }

        if (this.header.m_Version >= SerializedFileFormatVersion.RefactorTypeData) {
            type.m_ScriptTypeIndex = this.reader.ReadInt16();
        }

        if (this.header.m_Version >= SerializedFileFormatVersion.HasTypeTreeHashes) {
            if (isRef && type.m_ScriptTypeIndex >= 0) {
                type.m_ScriptID = new Uint8Array(this.reader.ReadBytes(16));
            } else if ((this.header.m_Version < SerializedFileFormatVersion.RefactoredClassId && type.classID < 0) || (this.header.m_Version >= SerializedFileFormatVersion.RefactoredClassId && type.classID == 114)) {
                type.m_ScriptID = new Uint8Array(this.reader.ReadBytes(16));
            }

            type.m_OldTypeHash = new Uint8Array(this.reader.ReadBytes(16));
        }

        if (this.m_EnableTypeTree) {
            type.m_Type = new TypeTree();

            if (this.header.m_Version >= SerializedFileFormatVersion.Unknown_12 || this.header.m_Version == SerializedFileFormatVersion.Unknown_10) {
                type.m_Type.BlobRead(this.reader, this.header.m_Version);
            } else {
                type.m_Type.ReadTypeTree(this.reader, this.header.m_Version);
            }

            if (this.header.m_Version >= SerializedFileFormatVersion.StoresTypeDependencies) {
                if (isRef) {
                    type.m_KlassName = this.reader.ReadStringToNull();
                    type.m_NameSpace = this.reader.ReadStringToNull();
                    type.m_AsmName = this.reader.ReadStringToNull();
                } else {
                    const typeDepCount = this.reader.ReadInt32();
                    for (let i = 0; i < typeDepCount; i++) {
                        type.m_TypeDependencies.push(this.reader.ReadInt32());
                    }
                }
            }
        }

        return type;
    }

    private ReadObjects() {
        const objectCount = this.reader.ReadInt32();
        for (let i = 0; i < objectCount; i++) {
            let objectInfo = new ObjectInfo();

            if (this.bigIDEnabled != 0) {
                objectInfo.m_PathID = this.reader.ReadInt64();
            } else if (this.header.m_Version < SerializedFileFormatVersion.Unknown_14) {
                objectInfo.m_PathID = BigInt(this.reader.ReadInt32());
            } else {
                this.reader.AlignStream(4);
                objectInfo.m_PathID = this.reader.ReadInt64();
            }

            if (this.header.m_Version >= SerializedFileFormatVersion.LargeFilesSupport) {
                objectInfo.byteStart = this.reader.ReadInt64();
            } else {
                objectInfo.byteStart = BigInt(this.reader.ReadUint32());
            }

            objectInfo.byteStart += this.header.m_DataOffset;

            objectInfo.byteSize = this.reader.ReadUint32();
            objectInfo.typeID = this.reader.ReadInt32();

            if (this.header.m_Version < SerializedFileFormatVersion.RefactoredClassId) {
                objectInfo.classID = this.reader.ReadUint16();

                const serializedType = this.m_Types.find(x => x.classID === objectInfo.typeID);
                if (serializedType === undefined) {
                    console.error(`Failed to load object serializedType! ClassID: ${objectInfo.classID} TypeID: ${objectInfo.typeID}`);
                    continue;
                }

                objectInfo.serializedType = serializedType;
            } else {
                const serializedType = this.m_Types[objectInfo.typeID];
                objectInfo.serializedType = serializedType;
                objectInfo.classID = serializedType.classID;
            }

            if (this.header.m_Version < SerializedFileFormatVersion.HasScriptTypeIndex) {
                objectInfo.isDestroyed = this.reader.ReadUint16();
            }

            if (this.header.m_Version >= SerializedFileFormatVersion.HasScriptTypeIndex && this.header.m_Version < SerializedFileFormatVersion.RefactorTypeData) {
                objectInfo.serializedType.m_ScriptTypeIndex = this.reader.ReadInt16();
            }

            if (this.header.m_Version == SerializedFileFormatVersion.SupportsStrippedObject || this.header.m_Version == SerializedFileFormatVersion.RefactoredClassId) {
                objectInfo.stripped = this.reader.ReadByte();
            }

            this.m_Objects.push(objectInfo);
        }
    }

    private ReadScriptTypes() {
        if (this.header.m_Version >= SerializedFileFormatVersion.HasScriptTypeIndex) {
            const scriptCount = this.reader.ReadInt32();
            for (var i = 0; i < scriptCount; i++) {
                let m_ScriptType = new LocalSerializedObjectIdentifier();

                m_ScriptType.localSerializedFileIndex = this.reader.ReadInt32();
                if (this.header.m_Version < SerializedFileFormatVersion.Unknown_14) {
                    m_ScriptType.localIdentifierInFile = BigInt(this.reader.ReadInt32());
                } else {
                    this.reader.AlignStream(4);
                    m_ScriptType.localIdentifierInFile = this.reader.ReadInt64();
                }

                this.m_ScriptTypes.push(m_ScriptType);
            }
        }
    }

    private ReadExternals() {
        const externalCount = this.reader.ReadInt32();
        for (var i = 0; i < externalCount; i++) {
            var m_External =  new FileIdentifier();
            if (this.header.m_Version >= SerializedFileFormatVersion.Unknown_6) {
                this.reader.ReadStringToNull();
            }

            if (this.header.m_Version >= SerializedFileFormatVersion.Unknown_5) {
                m_External.guid = new TextDecoder().decode(this.reader.ReadBytes(16));
                m_External.type = this.reader.ReadInt32();
            }

            m_External.pathName = this.reader.ReadStringToNull();

            this.m_Externals.push(m_External);
        }
    }

    private ReadRefTypes() {
        if (this.header.m_Version >= SerializedFileFormatVersion.SupportsRefObject) {
            const refCount = this.reader.ReadInt32();
            for (let i = 0; i < refCount; i++) {
                this.m_RefTypes.push(this.ReadSerializedType(true))
            }
        }
    }

    public AddObject(obj: UnityObject) {
        this.ObjectList.push(obj);
        this.ObjectMap.set(obj.m_PathID, obj);
    }
}