import { RequestEnvelope } from "./RequestEnvelope.ts";
import type { RequestEnvelopePayload } from "./RequestEnvelope.ts";

const ASSET_NAME = "shared_resourcecontainer";

function main() {
    const loader = new Worker(new URL("./loader.ts", import.meta.url), { type: "module" });
    loader.postMessage(new RequestEnvelope("init", ASSET_NAME));

    loader.onmessage = (e: MessageEvent<RequestEnvelopePayload>) => {
        const { type, payload } = e.data
        switch (type) {
            case "init":
                loader.postMessage(new RequestEnvelope("images", null));
                break;
            case "images":
                var temp: string[] = []
                temp.push(payload as string)
                populateImages(temp);
                break;
            default:
                console.log(`Unknown type: ${type}`);
        }
    }
}

function populateImages(images: string[]) {
    const app = document.getElementById("app");
    if (!app) {
        throw new Error("#app not found");
    }

    let ul = app.querySelector("ul");

    if (!ul) {
        ul = document.createElement("ul");
        app.appendChild(ul);
    }

    for (const url of images) {
        const li = document.createElement("li");

        const img = document.createElement("img");
        img.src = url;
        img.alt = "";

        li.appendChild(img);
        ul.appendChild(li);
    }
}

main();