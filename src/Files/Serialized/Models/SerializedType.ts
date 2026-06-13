import { TypeTree } from "./TypeTree.js"

export class SerializedType {
    public classID = 0;
    public m_IsStrippedType = false;
    public m_ScriptTypeIndex = -1;
    public m_Type = new TypeTree();
    public m_ScriptID = new Uint8Array();
    public m_OldTypeHash = new Uint8Array();
    public m_TypeDependencies: number[] = [];
    public m_KlassName = "";
    public m_NameSpace = "";
    public m_AsmName = "";
}