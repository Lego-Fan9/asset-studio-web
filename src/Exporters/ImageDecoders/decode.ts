import { formatSizes } from './header-info'
import type { FormatSize, LayerInfo } from './header-info.js'
import { decodeBC7Block } from './bc7'

type blockDecodeFunctionType = (inputBuffer: Uint8Array, size: FormatSize) => Uint8Array

const blockDecode: Record<string, blockDecodeFunctionType> = {
    'BC7': decodeBC7Block,
}

const rgbaPixelSize: number = formatSizes['RGBA'].blockSize

export function decodeImage(inputBuffer: Uint8Array, imageFormat: string, layer: LayerInfo): Uint8Array {
    const shape = layer.shape
    const format = formatSizes[imageFormat]
    const decodeFunc = blockDecode[imageFormat]
    const blockIDWidth = Math.floor((shape.width + format.blockWidth - 1) / format.blockWidth)
    const blockIDHeight = Math.floor((shape.height + format.blockHeight - 1) / format.blockHeight)

    var resultImage = new Uint8Array(shape.width * shape.height * rgbaPixelSize)
    var offsetIn = layer.offset
    for (var y = 0; y < blockIDHeight; y++) {
        const startPixelY = y * format.blockHeight
        const blockYCount = startPixelY + format.blockHeight > shape.height ? shape.height - startPixelY : format.blockHeight

        for (var x = 0; x < blockIDWidth; x++) {
            const uint8Buffer = new Uint8Array(inputBuffer.buffer, inputBuffer.byteOffset + offsetIn, format.blockSize)
            const workBuffer = decodeFunc(uint8Buffer, format)

            const startPixelX = x * format.blockWidth
            const blockXCount = startPixelX + format.blockWidth > shape.width ? shape.width - startPixelX : format.blockWidth
            const copySize = blockXCount * rgbaPixelSize

            for (var i = 0; i < blockYCount; i++) {
                const sourceStart = i * format.blockWidth * rgbaPixelSize
                const targetStart = ((startPixelY + i) * shape.width + startPixelX) * rgbaPixelSize
                resultImage.set(workBuffer.subarray(sourceStart, sourceStart + copySize), targetStart)
            }

            offsetIn += format.blockSize
        }
    }

    return resultImage
}