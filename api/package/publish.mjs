import {uploadFile} from "./helpers.mjs";
import {currentDir} from "../../index.mjs";
import fs from "node:fs";

export async function publishPackage(){

    let files = fs.readdirSync(currentDir, {withFileTypes: true, recursive: true});

    let result = await uploadFile(`/api/upload`, {
        host: "http://localhost:5000",
        authObj: {
            "x-session-id": null,
            "x-public-key": null,
        },
        onProgress(percent) {
            console.log(`${percent}%`);
        }
    });

    /*
    authObj: {
            "x-session-id": encodeURIComponent(await getSessionIdFromHost(await getHomeSocket().host)),
            "x-public-key": encodeURIComponent(await Client().GetPublicKey()),
        }
     */

    console.log(result);
}