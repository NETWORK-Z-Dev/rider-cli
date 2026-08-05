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
    return JSON.parse(getPackageConfigPath());
}

export async function uploadFile(filePath, {
    authObj = {},
    onProgress = null,
    params = {},
    type = "upload",
    host = null,
} = {}) {
    const chunkSize = 1024 * 256;
    const stat = await fs.stat(filePath);

    const totalChunks = Math.ceil(stat.size / chunkSize);
    const fileId = crypto.randomUUID();
    const filename = path.basename(filePath);

    const file = await fs.open(filePath, "r");

    let lastPercent = -1;

    try {
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const remaining = stat.size - start;
            const currentChunkSize = Math.min(chunkSize, remaining);

            const buffer = Buffer.alloc(currentChunkSize);

            await file.read(buffer, 0, currentChunkSize, start);

            const search = new URLSearchParams({
                ...params
            });

            const url = `${host ?? ""}/upload${search.toString() ? `?${search}` : ""}`;

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    ...authObj,
                    "x-upload-type": type,
                    "x-file-name": encodeURIComponent(filename),
                    "x-chunk-index": String(i),
                    "x-total-chunks": String(totalChunks),
                    "x-file-id": fileId
                },
                body: buffer
            });

            let json;

            try {
                json = await res.json();
            } catch {
                return {
                    ok: false,
                    error: "invalid_server_response",
                    status: res.status
                };
            }

            if (!res.ok || !json.ok) {
                return json;
            }

            const percent = Math.round(((i + 1) / totalChunks) * 100);

            if (percent !== lastPercent) {
                lastPercent = percent;

                if (typeof onProgress === "function") {
                    await onProgress(percent);
                }
            }

            if (json.path) {
                return json;
            }
        }
    } finally {
        await file.close();
    }

    return {
        ok: false,
        error: "unknown_upload_error"
    };
}