import { EndianType } from "../Enums/Endian.js"

export class EndianBinaryReader {
    public view: DataView;
    public buffer: ArrayBuffer
    public endian: EndianType

    protected internalOffset = 0;
    protected baseOffset = 0;
    protected length = 0;

    get offset() {
        return this.internalOffset;
    }

    set offset(value: number) {
        if (value < this.baseOffset || value > this.baseOffset + this.length) {
            console.log(`Out of bounds!`);
        }
        
        this.internalOffset = value;
    }

    constructor(buffer: ArrayBuffer, endian?: EndianType | null);
    constructor(reader: EndianBinaryReader);
    constructor(bufferOrReader: ArrayBuffer | EndianBinaryReader, endian?: EndianType | null) {
        if (bufferOrReader instanceof EndianBinaryReader) {
            const reader = bufferOrReader;
            this.view = reader.view;
            this.buffer = reader.buffer;
            this.offset = reader.offset;
            this.endian = reader.endian;
            this.length = reader.length
            return;
        }

        this.buffer = bufferOrReader;
        this.view = new DataView(this.buffer);
        this.offset = 0;
        this.length = this.view.byteLength;

        this.endian = endian ?? EndianType.BigEndian;
    }

    private getEndian(endian?: EndianType): boolean {
        const actualEndian = endian ?? this.endian;
        return actualEndian === EndianType.LittleEndian;
    }

    public AlignStream(to: number) {
        const mod = this.offset % to;
        if (mod != 0) {
            this.offset += to - mod;
        }
    }

    public ReadByte(): number {
        return this.view.getUint8(this.offset++)
    }

    public ReadBytes(count: number, readTo?: Uint8Array): Uint8Array {
        if (!readTo) {
            readTo = new Uint8Array(count);
        }

        for (let i = 0; i < count; i++) {
            readTo[i] = this.ReadByte();
        }

        return readTo;
    }

    public ReadStringToNull(maxLen?: number): string {
        let response = "";

        while (this.offset < this.view.byteLength) {
            if (maxLen !== undefined && response.length >= maxLen) {
                break;
            }

            const char = this.ReadByte();

            if (char === 0) {
                break;
            }

            response += String.fromCharCode(char);
        }

        return response;
    }

    public ReadAlignedString(): string {
        const length = this.ReadInt32();
        if (length > this.view.byteLength - this.offset) {
            throw new Error("Tried to read past end of buffer");
        }

        if (length <= 0) {
            return "";
        }

        const response = new TextDecoder("utf-8").decode(this.ReadBytes(length));
        
        this.AlignStream(4);

        return response;
    }

    public ReadBoolean(): boolean {
        return this.ReadByte() !== 0;
    }

    public ReadUint16(endian?: EndianType): number {
        const num = this.view.getUint16(this.offset, this.getEndian(endian));

        this.offset += 2;

        return num;
    }

    public ReadInt16(endian?: EndianType): number {
        const num = this.view.getInt16(this.offset, this.getEndian(endian));

        this.offset += 2;

        return num;
    }

    public ReadUint32(endian?: EndianType): number {
        const num = this.view.getUint32(this.offset, this.getEndian(endian));

        this.offset += 4;

        return num;
    }

    public ReadInt32(endian?: EndianType): number {
        const num = this.view.getInt32(this.offset, this.getEndian(endian));

        this.offset += 4;

        return num;
    }

    public ReadUint64(endian?: EndianType): bigint {
        const num = this.view.getBigUint64(this.offset, this.getEndian(endian));

        this.offset += 8;

        return num;
    }

    public ReadInt64(endian?: EndianType): bigint {
        const num = this.view.getBigInt64(this.offset, this.getEndian(endian));

        this.offset += 8;

        return num;
    }

    public ReadUint32At(pos: number, endian?: EndianType): number {
        return this.view.getUint32(pos, this.getEndian(endian))
    }

    public ReadInt64At(pos: number, endian?: EndianType): bigint {
        return this.view.getBigInt64(pos, this.getEndian(endian))
    }

    public ReadSingle(endian?: EndianType): number {
        const num = this.view.getFloat32(this.offset, this.getEndian(endian));

        this.offset += 4;

        return num;
    }

    public ReadDouble(endian?: EndianType): number {
        const num = this.view.getFloat64(this.offset, this.getEndian(endian));

        this.offset += 8;

        return num;
    }

    public IndexOf(pattern: Uint8Array, start: number = this.offset): number {
        const len = this.view.byteLength;
        const patLen = pattern.length;

        if (patLen === 0) return -1;

        outer: for (let i = start; i <= len - patLen; i++) {
            for (let j = 0; j < patLen; j++) {
                if (this.view.getUint8(i + j) !== pattern[j]) {
                    continue outer;
                }
            }
            return i;
        }

        return -1;
    }

    public LastOffsetOf(pattern: Uint8Array, start: number = this.offset): number {
        const len = this.view.byteLength;
        const patLen = pattern.length;

        if (patLen === 0) return -1;

        const maxStart = Math.min(start, len - patLen);

        outer: for (let i = maxStart; i >= 0; i--) {
            for (let j = 0; j < patLen; j++) {
                if (this.view.getUint8(i + j) !== pattern[j]) {
                    continue outer;
                }
            }
            return i;
        }

        return -1;
    }

    public Slice(start: number, length: number): Uint8Array {
        return new Uint8Array(this.buffer.slice(start, start + length));
    }

    public isAllZero(): boolean {
        for (let i = 0; i < this.view.byteLength; i++) {
            if (this.view.getUint8(i) !== 0) {
                return false;
            }
        }
        return true;
    }
}