import { EndianBinaryReader } from "./Util/EndianBinaryReader.js";
import { FileReader } from "./Util/FileReader.js";
import { FileType } from "./Enums/FileType.js";
import { ClassIDType } from "./Enums/ClassIDType.js"
import { BundleFile } from "./Files/Bundle/BundleFile.js";
import { UnityVersion } from "./Util/UnityVersions.js"
import { SerializedFile } from "./Files/Serialized/SerializedFile.js"
import { SerializedFileFormatVersion } from "./Files/Serialized/Models/SerializedFileFormatVersion.js"
import { ObjectReader } from "./Util/ObjectReader.js";
import { UnityObject } from "./Classes/Object.js";
import { Texture2D } from "./Classes/Texture2D.js";
import path from "./Util/path/index.js";

export class AssetsManager {
    public loadedAssetsFileNames: string[] = [];
    public loadedAssetsFiles: SerializedFile[] = [];
    public resourceReaders = new Map<string, FileReader>()

    public LoadFile(data: ArrayBuffer, name: string) {
        const endianReader = new EndianBinaryReader(data)
        const fileReader = new FileReader(name, endianReader);

        this.LoadFileByType(fileReader);
    }

    private LoadFileByType(reader: FileReader) {
        switch (reader.FileType) {
            case FileType.BundleFile:
                this.LoadBundleFile(reader);
        }

        this.ReadAssets();
    }

    private LoadBundleFile(reader: FileReader) {
        const bundleFile = new BundleFile(reader, false);
        console.log(bundleFile);

        let isLoaded = this.LoadBundleFiles(reader, bundleFile)

        if (bundleFile.IsDataAfterBundle) {
            throw new Error("Data after bundle not supported") //TODO
        }

        return isLoaded
    }

    private LoadBundleFiles(reader: FileReader, bundle: BundleFile): boolean {
        for (const file of bundle.fileList) {
            if (file.stream.isAllZero()) {
                continue;
            }

            file.stream.offset = 0;

            const dummyPath = path.join(path.dirname(reader.FullPath), file.fileName);
            const subReader = new FileReader(dummyPath, file.stream)
            if (subReader.FileType == FileType.AssetsFile) {
                if (!this.LoadAssetsFromMemory(subReader, reader.FullPath, bundle.m_Header.unityRevision)) {
                    return false;
                }
            } else {
                console.log(`Setting resS with len: ${subReader.view.byteLength}`);
                this.resourceReaders.set(file.fileName, subReader);
            }
        }

        return true;
    }

    private LoadAssetsFromMemory(reader: FileReader, originalPath: string, assetBundleUnityVersion?: UnityVersion): boolean {
        if (reader.FileName in this.loadedAssetsFileNames) {
            console.info(`Skipping ${reader.FileName} as it is loaded already`);

            return true;
        }

        try {
            const assetsFile = new SerializedFile(reader, this);
            assetsFile.originalPath = originalPath;

            if (assetBundleUnityVersion !== undefined && assetsFile.header.m_Version < SerializedFileFormatVersion.Unknown_7) {
                assetsFile.version = assetBundleUnityVersion;
            }

            if (assetsFile.version.isStripped) {
                if (assetBundleUnityVersion === undefined) {
                    throw new Error("AssetsFile UnityVersion was stripped and could not be found");
                }

                console.warn(`AssetsFile UnityVersion was stripped. Assumed version is ${assetBundleUnityVersion.toString()}`);
                assetsFile.version = assetBundleUnityVersion;
            }

            this.loadedAssetsFiles.push(assetsFile);
            this.loadedAssetsFileNames.push(reader.FileName);

        } catch (err) {
            console.warn(`Failed to load AssetsFile: ${reader.FileName} It may be a resS ${err}`);

            this.resourceReaders.set(reader.FileName, reader);

            return false;
        }

        return true;
    }

    private ReadAssets() {
        for (let assetsFile of this.loadedAssetsFiles) {
            for (let objectInfo of assetsFile.m_Objects) {
                let objectReader = new ObjectReader(assetsFile.reader, assetsFile, objectInfo);
                //try {
                    let obj: UnityObject | null = null;

                    if (objectReader.type == ClassIDType.Texture2D) {
                        obj = new Texture2D(objectReader);
                    } else {
                        obj = new UnityObject(objectReader);
                    }

                    if (obj !== null) {
                        assetsFile.AddObject(obj);
                    }

                //} catch (err) {
                //    console.error(`Failed to load object ${assetsFile.originalPath} error: ${err}`);
                //}
            }
        }
    }
}

export { ExportTexture2D } from "./Exporters/Texture2D.js";
export { Texture2D } from "./Classes/Texture2D.js";
