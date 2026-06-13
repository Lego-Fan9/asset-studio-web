import { EditorExtension } from "./EditorExtension.js";
import { ObjectReader } from "../Util/ObjectReader.js";

export class NamedObject extends EditorExtension {
    public m_Name: string;

    constructor(reader: ObjectReader) {
        super(reader);

        this.m_Name = reader.ReadAlignedString();
    }
}