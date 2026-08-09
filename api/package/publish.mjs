import {getPackageConfigObj, getPackageHost, uploadFile} from "./helpers.mjs";
import {currentDir, signer} from "../../index.mjs";
import fs from "node:fs";
import Logger from "@hackthedev/terminal-logger";
import path from "path";
import {getSessionId} from "../../helpers.mjs";

export async function publishPackage() {

    let packageConfig = getPackageConfigObj();
    let files = fs.readdirSync(currentDir, {withFileTypes: true, recursive: true});
    if (!checkFileArrayLength(files)) return;

    // used for filtering uploaded files
    let filteredFiles = [];
    let ignoreList = [
        "node_modules",
        "rider_modules",
        ".git",
        ".idea",
    ]

    // this will actually filter them
    for (let file of files) {
        let fileName = file.name;
        let filePath = path.join(file.path, file.name);

        // ignore some specific files etc
        if (!ignoreList.some(ignore => filePath.includes(ignore) || fileName.includes(ignore))) {
            filteredFiles.push(file);
        }
    }

    // check the filtered array again
    if (!checkFileArrayLength(filteredFiles)) return;

    Logger.info(`Uploading ${filteredFiles?.length ?? 0} files...`)
    for(let file of filteredFiles) {
        let fileName = file.name;
        let filePath = path.join(file.path, file.name);
        let isFile = file.isFile();

        if(!isFile) continue

        let result = await uploadFile(filePath, {
            host: "http://localhost:5000",
            authObj: {
                "x-session-id": await getSessionId(getPackageHost()),
                "x-public-key": encodeURIComponent(await signer.getPublicKey()),
            },
            params: {
                type: "package",
                name: packageConfig.name,
                version: packageConfig.version,
                isPublic: 1
            },
            includeDir: true,
        });

        let uploaded = result?.ok === true && result?.path
        if(!uploaded){
            Logger.error(`Failed to upload file ${fileName}`);
            Logger.error(result?.error)
        }
    }

    function checkFileArrayLength(arr) {
        if (!arr) throw new Error("No array passed!")
        if (arr.length === 0) {
            Logger.error("No files found to publish")
            return false
        } else {
            return true
        }
    }
}