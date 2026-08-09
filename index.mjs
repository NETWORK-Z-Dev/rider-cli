#!/usr/bin/env node


import { dSyncSign } from "@hackthedev/dsync-sign";
import os from "node:os";
import path from "path";
import {initPackage} from "./api/package/init.mjs";
import {publishPackage} from "./api/package/publish.mjs";
import {installPackage} from "./api/package/install.mjs";
import {bumpPackageVersion} from "./api/package/bump.mjs";

let appDir = path.join(os.homedir(), "rider-cli")
export const currentDir = process.cwd();
let keyFile = path.join(os.homedir(), "cli-key.json")

export const signer = new dSyncSign(keyFile);
await signer.ensureKeyPair()

const [, , command, ...args] = process.argv;

switch (command) {
    case "init":
        await initPackage()
        break;

    case "publish":
        await publishPackage()
        break;

    case "install":
        await installPackage(args[0])
        break;

    case "key":
        console.log(await signer.getPublicKey())
        break;
    case "gid":
        console.log(await signer.generateGid(await signer.getPublicKey()))
        break;

    case "bump":
        await bumpPackageVersion()
        break;


    default:
        console.log(`Unkown command: ${command}`);
}