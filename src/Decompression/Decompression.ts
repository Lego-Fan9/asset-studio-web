import { CompressionType } from "../Enums/CompressionType.js";
import { decompressBlock as decompressLz4 } from "./Lz4/lz4.js";
import { decompressSync } from "./Lzma/sync.js"

export function Decompress(input: Uint8Array, output: Uint8Array, type: CompressionType, uncompressedSize: number): number {
    let numWrite = -1;

    switch (type) {
        case CompressionType.Lz4:
        case CompressionType.Lz4HC:
            numWrite = decompressLz4(input, output, 0, input.length, 0);
            break;
        case CompressionType.Lzma:
            let lzmaStream = buildLzmaStream(input, uncompressedSize);

            let decompressed = decompressSync(lzmaStream);
            if (typeof decompressed === "string") {
                console.error("LZMA Decompressor returned string.");
                break;
            }

            numWrite = decompressed.length;
            output.set(decompressed);
            break;
        default:
            console.error(`CompressionType not supported: ${type}`);
    }

    return numWrite;
}

function buildLzmaStream(rawData: Uint8Array, uncompressedSize: number): Uint8Array {
    const props = rawData.slice(0, 5);
    const payload = rawData.slice(5);

    const result = new Uint8Array(
        5 + 8 + payload.length
    );

    result.set(props, 0);

    const view = new DataView(result.buffer);
    view.setBigUint64(5, BigInt(uncompressedSize), true);

    result.set(payload, 13);

    return result;
}