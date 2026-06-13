import { ObjectReader } from "../Util/ObjectReader.js";

export class StreamingInfo {
    public offset = 0n;
    public size = 0;
    public path = "";

    constructor(reader?: ObjectReader) {
        if (reader === undefined) {
            return;
        }

        if (reader.version.major >= 2020) {
            this.offset = reader.ReadInt64();
        } else {
            this.offset = BigInt(reader.ReadUint32());
        }

        this.size = reader.ReadUint32();
        this.path = reader.ReadAlignedString();
    }
}