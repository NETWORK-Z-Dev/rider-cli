import {getPackageConfigObj, getPackageConfigPath, setPackageConfigObj} from "./helpers.mjs";
import fs from "node:fs";
import Logger from "@hackthedev/terminal-logger";

export async function bumpPackageVersion(){
    if(!fs.existsSync(getPackageConfigPath())) return Logger.error("No package.json config file found :/");

    let packageConfig = getPackageConfigObj()
    let rawVersion = packageConfig?.version;

    // some checks like if it exists and if the version format has stuff like "1.0"
    // and not just "1", "2", etc...
    if(!rawVersion) return Logger.error("Missing version key in package.json");
    if(rawVersion.indexOf(".") === -1) return Logger.error("Only supporting version numbers with minimum 1 '.' - Example: 1.0, 10.1220.984.45, ...")

    let versionArr = rawVersion.split(".").filter(char => char !== ".");
    let parsedVersionNumber = BigInt(versionArr.join(""));
    let newVersionNumber = ++parsedVersionNumber;
    let newVersionFormatted = String(newVersionNumber).split("").join(".");


    packageConfig.version = newVersionFormatted;
    setPackageConfigObj(packageConfig);


    Logger.success(`Package version was bumped from ${rawVersion} to ${newVersionFormatted}`);
}