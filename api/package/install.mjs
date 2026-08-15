import {getPackageHost, getPackageUrl} from "./helpers.mjs";
import Logger from "@hackthedev/terminal-logger";
import {currentDir} from "../../index.mjs";
import path from "path";
import fs from "node:fs";
import {execSync} from "node:child_process";
import {version} from "../../../../dcts-shipping/docs/.vitepress/cache/deps/vue.js";

export function installFromBun(identifier, version = null){
    let packageIdentifier = `${identifier}${version ? `@${version}` : ""}`;

    try{
        execSync(`bun install "${packageIdentifier}" --ignore-scripts`, {
            stdio: "inherit"
        });

        return true;
    }
    catch{
        return false;
    }
}

export async function installPackage(identifier, customPath = null){
    let localPackageConfigFilePath = path.join(currentDir, "rider.json");
    let localPackageConfigExists = fs.existsSync(localPackageConfigFilePath);

    // no config file or identifier
    if(!identifier && !localPackageConfigExists) throw new Error("Missing package identifier");

    // get version from @scope/package@version etc and other variants
    let splitPackageArr = identifier?.split("/")[1]?.split("@") ?? [];
    let packageVersion = splitPackageArr[1] ?? null;

    // some trickery
    if(packageVersion === "latest") packageVersion = null;

    // if no identifier but local config path
    if(!identifier && localPackageConfigExists){
        let localPackageConfigObj = JSON.parse(fs.readFileSync(localPackageConfigFilePath, "utf8"));

        if(Object.keys(localPackageConfigObj?.packages)?.length > 0){
            for(let key in localPackageConfigObj?.packages){
                let configPackageIdentifier = key;
                let configPackageVersion = localPackageConfigObj?.packages[key];

                // install package
                await actuallyInstallPackage(configPackageIdentifier, configPackageVersion)
            }
        }
        else{
            Logger.error("No packages found in local package config")
        }
    }
    else{
        await actuallyInstallPackage(identifier, packageVersion)
    }


    async function actuallyInstallPackage(actualIdentifier, actualVersion = null){
        // get general package info n shit
        let fullPackageName = `${Logger.colors.fgYellow}${actualIdentifier}${actualVersion ? `@${actualVersion}` : ""}${Logger.colors.fgCyan}`;

        let packageInfo = await getPackageDetails(actualIdentifier, actualVersion);
        if(packageInfo?.error){
            // if the package wasnt found
            if(packageInfo.response.status === 404){
                // we will try to fallback to npm if possible
                let bunResult = installFromBun(actualIdentifier, actualVersion);

                // and if that fails then we're shit out of luck
                if(bunResult !== true){
                    Logger.error(`Unable to install package: ${fullPackageName} - Unable to fetch details`);
                    Logger.error(packageInfo.error);

                    return {
                        error: `Unable to install package ${fullPackageName} - Unable to fetch details`,
                        response: packageInfo.response,
                    }
                }
            }
        }

        // check if the got "valid data"
        let packageObj = packageInfo?.package;
        if(packageObj?.name){

            // main install path of the package
            let packageRootFolder = path.join(currentDir, "node_modules", packageObj.name);
            let installedPackageVersionFile = path.join(currentDir, "node_modules", packageObj.name, "version.info");

            // check if the package is already installed and if its the same version
            if(fs.existsSync(installedPackageVersionFile)){
                let locallyInstalledVersion = fs.readFileSync(installedPackageVersionFile, "utf8");
                if(locallyInstalledVersion == actualVersion) {
                    Logger.info(`Skipping ${fullPackageName} because its already installed`)
                    return {
                        error: null
                    }
                }
            }

            Logger.info(`Installing package '${fullPackageName}'`)

            // build the api url to get the files from the package.
            // the reason its not hardcoded is to keep it as dynamic as possible so
            // it could be changed without requiring extra work here as well.
            // at least thats the idea behind it- lets see if it works like that in practise.
            let fileUrl = `${getPackageHost(actualIdentifier)}/${packageObj.meta.paths.files}/no-version`;
            if(!fileUrl) return {
                error: `Unable to fetch package files ${fullPackageName}`
            }

            // fetch the package files
            let fileInfo = await getPackageFiles(fileUrl)
            let fileListObj = fileInfo?.files;

            // and check if we got any files
            if(fileListObj.length === 0) return {
                error: `No files found for ${fullPackageName}`,
            }

            // for each file we will build the file url as well.
            // this is the way we download them lol
            for(let file of fileListObj){
                let fileDownloadUrl = `${getPackageUrl(packageObj.name)}/${file}`
                let localFilePath = customPath ? path.join(customPath, packageObj.name, file) : path.join(packageRootFolder, file)

                await checkLocalPackagePath(localFilePath);
                await registerPackageInLocalConfig(packageObj.name, packageObj.version);
                await downloadFile(fileDownloadUrl, localFilePath);
            }

            // create a version file if it doesnt exist yet
            if(!fs.existsSync(path.join(packageRootFolder, "version.info"))) {
                fs.writeFileSync(path.join(packageRootFolder, "version.info"), actualVersion)
            }

            Logger.success(`Installed package '${fullPackageName}'`)
        }
        else{
            Logger.error("Missing package data?")
            return {
                error: "Missing package data?"
            }
        }
    }
}

export async function registerPackageInLocalConfig(packageName, version){
    if(!packageName) throw new Error("Missing package name for local registry");
    if(!version) throw new Error("Missing package version for local registry");

    // just some shit
    let localPackageConfigFilePath = path.join(currentDir, "rider.json");
    let localPackageConfigObj = {};

    // exists? parse it.
    if(fs.existsSync(localPackageConfigFilePath)) localPackageConfigObj = JSON.parse(fs.readFileSync(localPackageConfigFilePath, "utf8"));

    // this is important because if .package[packageName] doesnt exist
    // it will shit its fucking pants. trust me.
    localPackageConfigObj.packages ??= {};
    // set the fucking value
    localPackageConfigObj.packages[packageName] ??= version

    // and then write it.
    fs.writeFileSync(localPackageConfigFilePath, JSON.stringify(localPackageConfigObj, null, 4));
}

export async function downloadFile(url, targetPath) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} - ${response.statusText} » ${url}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
}

export async function getPackageDetails(identifier, version = null){
    if(!identifier) throw new Error("Missing package identifier");

    let infoRes = await fetch(getPackageUrl(identifier, version), {
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