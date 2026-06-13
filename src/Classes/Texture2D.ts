import { Texture } from "./Texture.js"
import { ObjectReader } from "../Util/ObjectReader.js";
import { ResourceReader } from "../Util/ResourceReader.js";
import { TextureFormat } from "../Enums/TextureFormat.js";
import { GLTextureSettings } from "./GLTextureSettings.js";
import { StreamingInfo } from "./StreamingInfo.js";

export class Texture2D extends Texture {
    public m_Width: number;
    public m_Height: number;
    public m_CompleteImageSize: number;
    public m_TextureFormat: TextureFormat;
    public m_MipMap: boolean;
    public m_MipCount: number;
    public m_TextureSettings: GLTextureSettings;
    public m_ImageCount: number;
    public m_PlatformBlob: Uint8Array;
    public image_data: ResourceReader;
    public m_StreamData: StreamingInfo;

    constructor(reader: ObjectReader) {
        super(reader);

        this.m_Width = reader.ReadInt32();
        this.m_Height = reader.ReadInt32();
        this.m_CompleteImageSize = reader.ReadUint32();

        if (reader.version.major >= 2020) {
            reader.ReadInt32(); // m_MipsStripped
        }

        this.m_TextureFormat = reader.ReadInt32();

        if (reader.version.compareTo([5, 2]) < 0) {
            this.m_MipMap = reader.ReadBoolean();
            this.m_MipCount = 0;
        } else {
            this.m_MipMap = false;
            this.m_MipCount = reader.ReadInt32();
        }

        if (reader.version.compareTo([2, 6]) >= 0) {
            reader.ReadBoolean(); // m_IsReadable
        }

        if (reader.version.major >= 2020) {
            reader.ReadBoolean(); // m_IsPreProcessed
        }

        if (reader.version.compareTo([2019, 3]) >= 0) {
            if (reader.version.compareTo([2022, 2]) >= 0) {
                reader.ReadBoolean(); // m_IgnoreMipmapLimit
                reader.AlignStream(4);
            }

            reader.ReadBoolean(); // m_IgnoreMasterTextureLimit
        }

        if (reader.version.compareTo([3, 0]) >= 0 && reader.version.compareTo([5, 5]) < 0) {
            reader.ReadBoolean(); // m_ReadAllowed
        }

        if (reader.version.compareTo([2022, 2]) >= 0) {
            reader.ReadAlignedString(); // m_MipmapLimitGroupName
        }

        if (reader.version.compareTo([2018, 2]) >= 0) {
            reader.ReadBoolean(); // m_StreamingMipmaps
        }

        reader.AlignStream(4);

        if (reader.version.compareTo([2018, 2]) >= 0) {
            reader.ReadInt32(); // m_StreamingMipmapsPriority
        }

        this.m_ImageCount = reader.ReadInt32();
        reader.ReadInt32(); //m_TextureDimension
        this.m_TextureSettings = new GLTextureSettings(reader);

        if (reader.version.major >= 3) {
            reader.ReadInt32(); // m_LightmapFormat
        }

        if (reader.version.compareTo([3, 5]) >= 0) {
            reader.ReadInt32(); // m_ColorSpace
        }

        if (reader.version.compareTo([2022, 2]) >= 0) {
            this.m_PlatformBlob = new Uint8Array(reader.ReadBytes(reader.ReadInt32()));
            reader.AlignStream(4);
        } else {
            this.m_PlatformBlob = new Uint8Array();
        }

        const imageDataSize = reader.ReadInt32();
        if (imageDataSize == 0 && reader.version.compareTo([5, 3])) {
            this.m_StreamData = new StreamingInfo(reader);
        } else {
            this.m_StreamData = new StreamingInfo();
        }

        if (this.m_StreamData.path !== "") {
            this.image_data = new ResourceReader(reader, this.m_StreamData.size, Number(this.m_StreamData.offset), this.m_StreamData.path);
        } else {
            this.image_data = new ResourceReader(reader, imageDataSize, reader.offset, "", true);
        }
    }
}