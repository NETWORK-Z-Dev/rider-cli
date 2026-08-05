import { dSyncSign } from "@hackthedev/dsync-sign";
import os from "node:os";
import path from "path";
import {initPackage} from "./api/package/init.mjs";

let appDir = path.join(os.homedir(), "rider-cli")
export const currentDir = process.cwd();
let keyFile = path.join(os.homedir(), "cli-key.json")

const signer = new dSyncSign(keyFile);
await signer.ensureKeyPair()

const [, , command, ...args] = process.argv;

switch (command) {
    case "init":
        await initPackage()
        break;

    case "publish":
        console.log("publish", args);
        break;

    default:
        console.log("Unbekannter Befehl");
}