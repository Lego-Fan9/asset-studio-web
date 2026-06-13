import { NamedObject } from "./NamedObject.js";
import { ObjectReader } from "../Util/ObjectReader.js";

export class Texture extends NamedObject {
    constructor(reader: ObjectReader) {
        super(reader);

        if (this.version.compareTo([2017, 3]) >= 0) {
            if (this.version.compareTo([2023, 2]) < 0) {
                reader.ReadInt32(); // m_ForcedFallbackFormat
                reader.ReadByte(); // m_DownscaleFallback
            }

            if (this.version.compareTo([2020, 2]) >= 0) {
                reader.ReadByte(); // m_IsAlphaChannelOptional
            }

            reader.AlignStream(4);
        }
    }
}