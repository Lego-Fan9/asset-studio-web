import { UnityObject } from "./Object.js";
import { ObjectReader } from "../Util/ObjectReader.js";
import { BuildTarget } from "../Enums/BuildTarget.js";
import { PPtr} from "./PPtr.js"; 

export class EditorExtension extends UnityObject {
    constructor(reader: ObjectReader) {
        super(reader);

        if (this.platform === BuildTarget.NoTarget) {
            new PPtr<EditorExtension>(reader); // m_PrefabParentObject
            new PPtr<UnityObject>(reader); // m_PrefabInternal
        }
    }
}