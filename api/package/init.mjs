import {askPrompt} from "../../helpers.mjs";
import Logger from "@hackthedev/terminal-logger"
import * as fs from "node:fs";
import path from "path";
import {currentDir} from "../../index.mjs";
import {getPackageConfigPath, hasPackageConfigFile} from "./helpers.mjs";

export async function initPackage(){

    // config file location
    let packageConfigPath = getPackageConfigPath()

    // check if there is a config already that could be used hehe
    let hasConfig = hasPackageConfigFile();
    if(hasConfig){
        Logger.warn("Config file (package.json) already exists")
        Logger.warn(`Location: ${packageConfigPath}`)
        return;
    }

    // setup config if not
    let packageName = await askPrompt("Whats your package name?")
    if(!packageName || packageName.trim().length === 0) return Logger.error("You need to enter a valid project name!")

    let description = await askPrompt("Description? (default none)")
    if(!description) description = ""

    let version = await askPrompt("Enter a version (1.0.0)")
    if(!version) version = "1.0.0"

    let license = await askPrompt("Enter a license (NONE)")
    if(!license) license = "NONE"

    let packageConfig = {
        name: packageName,
        description,
        version,
        license,
    }

    if(!fs.existsSync(packageConfigPath)){
        fs.writeFileSync(packageConfigPath, JSON.stringify(packageConfig, null, 4));
        Logger.success("Package Config file has been setup!")
    }
}