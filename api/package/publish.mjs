import {getPackageConfigObj, uploadFile} from "./helpers.mjs";
import {currentDir} from "../../index.mjs";
import fs from "node:fs";
import Logger from "@hackthedev/terminal-logger";
import path from "path";

export async function publishPackage() {

    let packageConfig = getPackageConfigObj();
    let files = fs.readdirSync(currentDir, {withFileTypes: true, recursive: true});
    if (!checkFileArrayLength(files)) return;

    // used for filtering uploaded files
    let filteredFiles = [];
    let ignoreList = [
        "node_modules",
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

    for(let file of filteredFiles) {
        let fileName = file.name;
        let filePath = path.join(file.path, file.name);
        let isFile = file.isFile();

        if(!isFile) continue

        Logger.info(`Uploading file ${fileName} - ${filePath}`)
        let result = await uploadFile(filePath, {
            host: "http://localhost:5000",
            authObj: {
                "x-session-id": null,
                "x-public-key": null,
            },
            params: {
                type: "package",
                name: packageConfig.name,
            },
            onProgress(percent) {
                console.log(`${percent}%`);
            },
            includeDir: true,
        });

        console.log(result);
    }

    /*
    authObj: {
            "x-session-id": encodeURIComponent(await getSessionIdFromHost(await getHomeSocket().host)),
            "x-public-key": encodeURIComponent(await Client().GetPublicKey()),
        }
     */

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