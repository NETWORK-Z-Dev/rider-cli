import fs from "node:fs";
import path from "path";
import {currentDir} from "../../index.mjs";
import crypto from "node:crypto";

export function hasPackageConfigFile(){
    if(!fs.existsSync(getPackageConfigPath())){
        return false
    }
    else if(fs.existsSync(getPackageConfigPath())){
        return true
    }
}

export function getPackageConfigPath(){
    return path.join(currentDir, "package.json")
}

export function getPackageConfigObj(){
    return JSON.parse(fs.readFileSync(getPackageConfigPath(), "utf8"));
}

export function setPackageConfigObj(packageObj){
    if(!packageObj) throw new Error("Missing package object")
    if(typeof packageObj !== "object") throw new Error("Supplied parameter is not a json object")

    fs.writeFileSync(getPackageConfigPath(), JSON.stringify(packageObj, null, 4));
}

export function getPackageHost(){
    return "https://dist.dcts.community";
}

export function getPackageUrl(identifier){
    if(!identifier) throw new Error("Missing identifier");
    return `${getPackageHost()}/api/package/${identifier}`;
}

export async function uploadFile(filePath, {
    authObj = {},
    onProgress = null,
    params = {},
    type = "upload",
    host = null,
    includeDir = false
} = {}) {
    const stat = fs.statSync(filePath);
    const chunkSize = 1024 * 256;
    const totalChunks = Math.ceil(stat.size / chunkSize);
    const fileId = crypto.randomUUID();
    const file = fs.openSync(filePath, "r");
    const filename = path.basename(filePath);
    let relativePath = path.relative(currentDir, filePath);

    for (let i = 0; i < totalChunks; i++) {
        const size = Math.min(chunkSize, stat.size - i * chunkSize);
        const buffer = Buffer.alloc(size);

        fs.readSync(file, buffer, 0, size, i * chunkSize);

        const res = await fetch(`${host}/api/upload?${new URLSearchParams(params)}`, {
            method: "POST",
            headers: {
                ...authObj,
                "x-upload-type": type,
                "x-file-name": encodeURIComponent(filename),
                "x-file-path": includeDir === true ? encodeURIComponent(relativePath) : null,
                "x-chunk-index": i,
                "x-total-chunks": totalChunks,
                "x-file-id": fileId
            },
            body: buffer
        });

        const json = await res.json();

        if (!json.ok) {
            fs.closeSync(file);
            return json;
        }

        if (onProgress) {
            await onProgress(Math.round(((i + 1) / totalChunks) * 100));
        }

        if (json.path) {
            fs.closeSync(file);
            return json;
        }
    }

    fs.closeSync(file);

    return { ok: true };
}