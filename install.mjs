import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

// i should turn this into a setting at some point so people can change hosts
const baseUrl = "https://dist.dcts.community/api/package/rider-cli";
const installDir = path.join(os.homedir(), ".rider-cli");

const filesResponse = await fetch(`${baseUrl}/files/no-version`);
const { files } = await filesResponse.json();

if (!files?.length) {
    throw new Error("No Rider CLI files found");
}

// cleanup old shit if present
fs.rmSync(installDir, {
    recursive: true,
    force: true
});

fs.mkdirSync(installDir, {
    recursive: true
});

for (const file of files) {
    const relativePath = file.split("/").slice(1).join("/");
    const targetPath = path.join(installDir, relativePath);

    fs.mkdirSync(path.dirname(targetPath), {
        recursive: true
    });

    const response = await fetch(`${baseUrl}/${relativePath}`);

    if (!response.ok) {
        throw new Error(`Failed downloading ${relativePath}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    fs.writeFileSync(targetPath, buffer);

    console.log(`Downloaded ${relativePath}`);
}

execSync("npm install", {
    cwd: installDir,
    stdio: "inherit"
});

execSync("npm link", {
    cwd: installDir,
    stdio: "inherit"
});

console.log("Rider CLI installed");