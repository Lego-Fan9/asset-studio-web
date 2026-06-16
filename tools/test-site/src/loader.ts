import { AssetsManager, ExportTexture2D, Texture2D } from "@lego-fan9/asset-studio-web";
import type { RequestEnvelopePayload } from "./RequestEnvelope.ts";
import { RequestEnvelope } from "./RequestEnvelope.ts";

const ASSET_VERSION = "100036";

let assetsManager: AssetsManager | null = null

self.onmessage = async (e: MessageEvent<RequestEnvelopePayload>) => {
    const { type, payload } = e.data;

    switch (type) {
        case "init":
            let resp = await fetch(`https://swgoh-assets.lego-fan9.workers.dev/?version=${ASSET_VERSION}&item=${payload}`);
            if (!resp.ok) {
                console.error(`HTTP error! status: ${resp.status}`);
                return;
            }

            const buffer = await resp.arrayBuffer();

            assetsManager = new AssetsManager();
            assetsManager.LoadFile(buffer, payload as string);

            console.log(assetsManager);

            self.postMessage(new RequestEnvelope("init", true));

            break;
        case "images":
            if (assetsManager === null) {
                console.log("Had a null assetsManager on image export");

                break;
            }

            for (var serFile of assetsManager.loadedAssetsFiles) {
                for (var obj of serFile.ObjectList) {
                    if (obj.classID === 28) {
                        const tex = await ExportTexture2D(obj as Texture2D)
                        if (tex !== null) {
                            self.postMessage(new RequestEnvelope("images", tex))
                        }
                    }
                }
            }

            break;
        default:
            console.log(`Unknown message type: ${type}`);
    }
}

export {};