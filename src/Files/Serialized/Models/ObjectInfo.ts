import { SerializedType } from "./SerializedType.js"

export class ObjectInfo {
    public byteStart = 0n;
    public byteSize = 0;
    public typeID = 0;
    public classID = 0;
    public isDestroyed = 0;
    public stripped = 0;

    public m_PathID = 0n;
    public serializedType = new SerializedType();
}