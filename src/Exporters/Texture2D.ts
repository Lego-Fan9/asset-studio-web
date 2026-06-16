import { Texture2D } from "../Classes/Texture2D.js";
import { TextureFormat } from "../Enums/TextureFormat.js";

import { decodeImage } from "./ImageDecoders/decode.js";

import { encodePng } from '@lunapaint/png-codec';

export async function ExportTexture2D(m_Texture2D: Texture2D): Promise<string | null> {
    console.log(`Starting export of ${m_Texture2D.m_Name}`);

    if (m_Texture2D.image_data.size === 0 || m_Texture2D.m_Width <= 0 || m_Texture2D.m_Height <= 0) {
        console.error("Tried to decode an image with no image_data, or with no size...");
        return null;
    }

    const imageBlob = m_Texture2D.image_data.GetData();
    if (imageBlob === null) {
        console.error("Could not read texture data from resS...");
        return null;
    }

    let outputImage = new Uint8Array(m_Texture2D.m_Width * m_Texture2D.m_Height * 4);
    let outputImageSuccess = false;

    if (m_Texture2D.m_TextureFormat === TextureFormat.DXT1) {
        outputImageSuccess = ExportDXT1(imageBlob, outputImage, m_Texture2D.m_Width, m_Texture2D.m_Height);
    } else if (m_Texture2D.m_TextureFormat === TextureFormat.RGBA32) {
        outputImage.set(imageBlob);
        outputImageSuccess = true;
    } else if (m_Texture2D.m_TextureFormat === TextureFormat.DXT5) {
        outputImageSuccess = ExportDXT5(imageBlob, outputImage, m_Texture2D.m_Width, m_Texture2D.m_Height);
    } else if (m_Texture2D.m_TextureFormat === TextureFormat.BC7) {
        outputImageSuccess = ExportBC7(imageBlob, outputImage, m_Texture2D.m_Width, m_Texture2D.m_Height);
    } else if (m_Texture2D.m_TextureFormat === TextureFormat.RGB24) {
        outputImageSuccess = ExportRGB24(imageBlob, outputImage, m_Texture2D.m_Width, m_Texture2D.m_Height);
    } else {
        throw new Error(`Unknown image format ${m_Texture2D.m_TextureFormat}`);
    }

    if (!outputImageSuccess) {
        return null;
    }

    const width = m_Texture2D.m_Width;
    const height = m_Texture2D.m_Height;
    const flipped = new Uint8Array(outputImage.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIndex = (y * width + x) * 4;
            const dstIndex = ((height - 1 - y) * width + x) * 4;

            flipped[dstIndex] = outputImage[srcIndex];
            flipped[dstIndex + 1] = outputImage[srcIndex + 1];
            flipped[dstIndex + 2] = outputImage[srcIndex + 2];
            flipped[dstIndex + 3] = outputImage[srcIndex + 3];
        }
    }

    const pngData = await encodePng({ data: flipped, width: m_Texture2D.m_Width, height: m_Texture2D.m_Height });

    let binary = "";
    for (let i = 0; i < pngData.data.length; i++) {
        binary += String.fromCharCode(pngData.data[i]);
    }

    const base64 = btoa(binary);

    return `data:image/png;base64,${base64}`;
}

function ExportDXT1(input: Uint8Array, outputRef: Uint8Array, width: number, height: number): boolean {
    try {
        const view = new DataView(input.buffer, 0, input.length);
        const decoded = decodeBC1(view, width, height);
        outputRef.set(decoded);
    } catch (err) {
        console.error(`Failed to decode img: ${err}`);

        return false;
    }

    return true;
}

function ExportDXT5(input: Uint8Array, outputRef: Uint8Array, width: number, height: number): boolean {
    try {
        const view = new DataView(input.buffer, 0, input.length);
        const decoded = decodeBC3(view, width, height, false);
        outputRef.set(decoded);
    } catch (err) {
        console.error(`Failed to decode img: ${err}`);

        return false;
    }

    return true;
}

function ExportBC7(input: Uint8Array, outputRef: Uint8Array, width: number, height: number): boolean {
    try {
        const decoded = decodeImage(input, 'BC7', { offset: 0, length: input.length, shape: { width: width, height: height } });
        outputRef.set(decoded);
    } catch (err) {
        console.error(`Failed to decode img: ${err}`);

        return false;
    }

    return true;
}

function ExportRGB24(input: Uint8Array, outputRef: Uint8Array, width: number, height: number): boolean {
    const pixelCount = width * height;

    const src = new Uint8Array(input);
    const rgba = new Uint8Array(pixelCount * 4);

    for (let i = 0, j = 0; i < pixelCount * 3; i += 3, j += 4) {
        rgba[j] = src[i];
        rgba[j + 1] = src[i + 1];
        rgba[j + 2] = src[i + 2];
        rgba[j + 3] = 255;
    }

    outputRef.set(rgba);

    return true;
}

/*
    BC1 and BC3 decoding from https://github.com/kchapelier/decode-dxt
*/

function decodeBC1(imageData: DataView, width: number, height: number): Uint8Array {
    var rgba = new Uint8Array(width * height * 4),
        height_4 = (height / 4) | 0,
        width_4 = (width / 4) | 0,
        offset = 0,
        colorValues,
        colorIndices,
        colorIndex,
        pixelIndex,
        rgbaIndex,
        h,
        w,
        x,
        y;

    for (h = 0; h < height_4; h++) {
        for (w = 0; w < width_4; w++) {
            colorValues = interpolateColorValues(imageData.getUint16(offset, true), imageData.getUint16(offset + 2, true), true);
            colorIndices = imageData.getUint32(offset + 4, true);

            for (y = 0; y < 4; y++) {
                for (x = 0; x < 4; x++) {
                    pixelIndex = (3 - x) + (y * 4);
                    rgbaIndex = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4;
                    colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03;
                    rgba[rgbaIndex] = colorValues[colorIndex * 4];
                    rgba[rgbaIndex + 1] = colorValues[colorIndex * 4 + 1];
                    rgba[rgbaIndex + 2] = colorValues[colorIndex * 4 + 2];
                    rgba[rgbaIndex + 3] = colorValues[colorIndex * 4 + 3];
                }
            }

            offset += 8;
        }
    }

    return rgba;
}

function interpolateColorValues(firstVal: number, secondVal: number, isDxt1: boolean) {
    var firstColor = convert565ByteToRgb(firstVal),
        secondColor = convert565ByteToRgb(secondVal),
        colorValues = ([] as number[]).concat(firstColor, 255, secondColor, 255);

    if (isDxt1 && firstVal <= secondVal) {
        colorValues.push(
            Math.round((firstColor[0] + secondColor[0]) / 2),
            Math.round((firstColor[1] + secondColor[1]) / 2),
            Math.round((firstColor[2] + secondColor[2]) / 2),
            255,

            0,
            0,
            0,
            0
        );
    } else {
        colorValues.push(
            Math.round(lerp(firstColor[0], secondColor[0], 1 / 3)),
            Math.round(lerp(firstColor[1], secondColor[1], 1 / 3)),
            Math.round(lerp(firstColor[2], secondColor[2], 1 / 3)),
            255,

            Math.round(lerp(firstColor[0], secondColor[0], 2 / 3)),
            Math.round(lerp(firstColor[1], secondColor[1], 2 / 3)),
            Math.round(lerp(firstColor[2], secondColor[2], 2 / 3)),
            255
        );
    }

    return colorValues;
};

function convert565ByteToRgb(byte: number) {
    return [
        Math.round(((byte >>> 11) & 31) * (255 / 31)),
        Math.round(((byte >>> 5) & 63) * (255 / 63)),
        Math.round((byte & 31) * (255 / 31))
    ];
};

function lerp(v1: number, v2: number, r: number) {
    return v1 * (1 - r) + v2 * r;
};

function decodeBC3(imageData: DataView, width: number, height: number, premultiplied: boolean) {
    var rgba = new Uint8Array(width * height * 4),
        height_4 = (height / 4) | 0,
        width_4 = (width / 4) | 0,
        offset = 0,
        alphaValues,
        alphaIndices,
        alphaIndex,
        alphaValue,
        multiplier,
        colorValues,
        colorIndices,
        colorIndex,
        pixelIndex,
        rgbaIndex,
        h,
        w,
        x,
        y;

    for (h = 0; h < height_4; h++) {
        for (w = 0; w < width_4; w++) {
            alphaValues = interpolateAlphaValues(imageData.getUint8(offset), imageData.getUint8(offset + 1));
            alphaIndices = [
                imageData.getUint16(offset + 6, true),
                imageData.getUint16(offset + 4, true),
                imageData.getUint16(offset + 2, true)
            ];

            colorValues = interpolateColorValues(imageData.getUint16(offset + 8, true), imageData.getUint16(offset + 10, true), false);
            colorIndices = imageData.getUint32(offset + 12, true);

            for (y = 0; y < 4; y++) {
                for (x = 0; x < 4; x++) {
                    pixelIndex = (3 - x) + (y * 4);
                    rgbaIndex = (h * 4 + 3 - y) * width * 4 + (w * 4 + x) * 4;
                    colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03;
                    alphaIndex = getAlphaIndex(alphaIndices, pixelIndex);
                    alphaValue = alphaValues[alphaIndex];

                    multiplier = premultiplied ? 255 / alphaValue : 1;

                    rgba[rgbaIndex] = multiply(colorValues[colorIndex * 4], multiplier);
                    rgba[rgbaIndex + 1] = multiply(colorValues[colorIndex * 4 + 1], multiplier);
                    rgba[rgbaIndex + 2] = multiply(colorValues[colorIndex * 4 + 2], multiplier);
                    rgba[rgbaIndex + 3] = alphaValue
                }
            }

            offset += 16;
        }
    }

    return rgba;
};

function interpolateAlphaValues(firstVal: number, secondVal: number) {
    var alphaValues = [firstVal, secondVal];

    if (firstVal > secondVal) {
        alphaValues.push(
            Math.floor(lerp(firstVal, secondVal, 1 / 7)),
            Math.floor(lerp(firstVal, secondVal, 2 / 7)),
            Math.floor(lerp(firstVal, secondVal, 3 / 7)),
            Math.floor(lerp(firstVal, secondVal, 4 / 7)),
            Math.floor(lerp(firstVal, secondVal, 5 / 7)),
            Math.floor(lerp(firstVal, secondVal, 6 / 7))
        );
    } else {
        alphaValues.push(
            Math.floor(lerp(firstVal, secondVal, 1 / 5)),
            Math.floor(lerp(firstVal, secondVal, 2 / 5)),
            Math.floor(lerp(firstVal, secondVal, 3 / 5)),
            Math.floor(lerp(firstVal, secondVal, 4 / 5)),
            0,
            255
        );
    }

    return alphaValues;
};

function multiply(component: number, multiplier: number) {
    if (!isFinite(multiplier) || multiplier === 0) {
        return 0;
    }

    return Math.round(component * multiplier);
};

function getAlphaIndex(alphaIndices: number[], pixelIndex: number) {
    return extractBitsFromUin16Array(alphaIndices, (3 * (15 - pixelIndex)), 3);
};

function extractBitsFromUin16Array(array: number[], shift: number, length: number) {
    // sadly while javascript operates with doubles, it does all its binary operations on 32 bytes integers
    // so we have to get a bit dirty to do the bitshifting on the 48 bytes integer for the alpha values of DXT5

    var height = array.length,
        heightm1 = height - 1,
        width = 16,
        rowS = ((shift / width) | 0),
        rowE = (((shift + length - 1) / width) | 0),
        shiftS,
        shiftE,
        result;

    if (rowS === rowE) {
        // all the requested bits are contained in a single uint16
        shiftS = (shift % width);
        result = (array[heightm1 - rowS] >> shiftS) & (Math.pow(2, length) - 1);
    } else {
        // the requested bits are contained in two continuous uint16
        shiftS = (shift % width);
        shiftE = (width - shiftS);
        result = (array[heightm1 - rowS] >> shiftS) & (Math.pow(2, length) - 1);
        result += (array[heightm1 - rowE] & (Math.pow(2, length - shiftE) - 1)) << shiftE;
    }

    return result;
};