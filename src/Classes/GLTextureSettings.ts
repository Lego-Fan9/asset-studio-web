import { ObjectReader } from "../Util/ObjectReader.js";

export class GLTextureSettings {
    public m_FilterMode = 0;
    public m_Aniso = 0;
    public m_MipBias = 0;
    public m_WrapMode = 0;

    constructor(reader: ObjectReader) {
        this.m_FilterMode = reader.ReadInt32();
        this.m_Aniso = reader.ReadInt32();
        this.m_MipBias = reader.ReadSingle();
        
        if (reader.version.major >= 2017) {
            this.m_WrapMode = reader.ReadInt32();
            reader.ReadInt32(); // m_WrapV 
            reader.ReadInt32(); // m_WrapW
        } else {
            this.m_WrapMode = reader.ReadInt32();
        }
    }
}