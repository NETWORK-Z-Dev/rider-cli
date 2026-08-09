import {getPackageHost, getPackageUrl} from "./helpers.mjs";
import Logger from "@hackthedev/terminal-logger";
import {currentDir} from "../../index.mjs";
import path from "path";
import fs from "node:fs";

export async function installPackage(identifier, customPath = null){
    if(!identifier) throw new Error("Missing package identifier");

    // get general package info n shit
    let packageInfo = await getPackageDetails(identifier);
    if(packageInfo?.error){
        Logger.error(`Unable to install package: ${identifier} - Unable to fetch details`);
        Logger.error(packageInfo.error);

        return {
            error: `Unable to install package ${identifier} - Unable to fetch details`
        }
    }

    // check if the got "valid data"
    let packageObj = packageInfo?.package;
    if(packageObj?.name){
        Logger.info(`Installing package '${Logger.colors.fgYellow}@${packageObj.account.username}/${identifier}${Logger.colors.fgCyan}'`)

        // build the api url to get the files from the package.
        // the reason its not hardcoded is to keep it as dynamic as possible so
        // it could be changed without requiring extra work here as well.
        // at least thats the idea behind it- lets see if it works like that in practise.
        let fileUrl = `${getPackageHost(identifier)}/${packageObj.meta.paths.files}`;
        if(!fileUrl) return {
            error: `Unable to fetch package files ${identifier}`
        }

        // fetch the package files
        let fileInfo = await getPackageFiles(fileUrl)
        let fileListObj = fileInfo?.files;

        // and check if we got any files
        if(fileListObj.length === 0) return {
            error: `No files found for ${identifier}`,
        }

        // for each file we will build the file url as well.
        // this is the way we download them lol
        for(let file of fileListObj){
            let fileDownloadUrl = `${getPackageUrl(packageObj.name)}`

            let localFilePath = customPath ? customPath : path.join(currentDir, "rider_modules", packageObj.name, packageObj.version)
            console.log(localFilePath)
            await checkLocalPackagePath(localFilePath)

            await downloadFile(fileDownloadUrl, localFilePath);
        }
    }
    else{
        Logger.error("Missing package data?")
        return {
            error: "Missing package data?"
        }
    }
}

export async function downloadFile(url, targetPath) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);

    Logger.info(`Downloaded ${url}`);

    return targetPath;
}

export async function getPackageDetails(identifier){
    if(!identifier) throw new Error("Missing package identifier");

    let infoRes = await fetch(getPackageUrl(identifier), {
        signal: AbortSignal.timeout(2500)
    })

    if(infoRes.status !== 200){
        return {
            error: "Unable to fetch package details for " + identifier,
            response: infoRes
        }
    }

    let rawJsonData = await infoRes.json();
    return {
        package: rawJsonData?.package,
        error: null,
        response: infoRes
    }
}

export async function getPackageFiles(url){
    if(!url) throw new Error("Missing package url");

    let filesRes = await fetch(url, {
        signal: AbortSignal.timeout(2500)
    })

    if(filesRes.status !== 200){
        return {
            error: "Unable to fetch package files for " + url,
            response: filesRes,
            files: null
        }
    }

    let rawJsonData = await filesRes.json();
    return {
        files: rawJsonData?.files,
        error: null,
        response: filesRes
    }
}

export async function checkLocalPackagePath(filePath){
    if(!filePath) throw new Error("Missing package identifier");

    let folderPath = path.dirname(filePath);
    if(!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
}