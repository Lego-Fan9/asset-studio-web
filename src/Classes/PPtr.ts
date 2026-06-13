import { UnityObject } from "./Object.js";
import { ObjectReader } from "../Util/ObjectReader.js";
import { SerializedFile } from "../Files/Serialized/SerializedFile.js";
import { SerializedFileFormatVersion } from "../Files/Serialized/Models/SerializedFileFormatVersion.js";

export class PPtr<_ extends UnityObject> {
    public m_FileID: number;
    public m_PathID: BigInt;

    // private index = -2;

    public assetsFile: SerializedFile;

    constructor(reader: ObjectReader) {
        this.m_FileID = reader.ReadInt32();

        if (reader.m_Version < SerializedFileFormatVersion.Unknown_14) {
            this.m_PathID = BigInt(reader.ReadInt32());
        } else {
            this.m_PathID = reader.ReadInt64();
        }

        this.assetsFile = reader.assetsFile;
    }

    /*private TryGetAssetsFile(): [SerializedFile | null, boolean] {
        let result = null

        if (this.m_FileID == 0) {
            result = this.assetsFile;
            return [result, true];
        }

        if (this.m_FileID > 0 && this.m_FileID - 1 < this.assetsFile.m_Externals.length) {
            const assetsManager = this.assetsFile.assetsManager;

            if (this.index === -2) {
                let m_External = this.assetsFile.m_Externals[this.m_FileID - 1]
                let name = m_External.pathName;
            }
        }

        return [result, false]
    }*/

    public IsNull() {
        if (this.m_PathID == 0n || this.m_FileID < 0) {
            return true;
        }
    }

    public TryGet(assetsFile?: SerializedFile): UnityObject | undefined {
        let _assetsFile = this.assetsFile;
        if (assetsFile !== undefined) {
            _assetsFile = assetsFile;
        }

        if (!this.IsNull()) {
            const out = _assetsFile.ObjectMap.get(this.m_PathID)
            return out;
        }

        return undefined;
    }
}
