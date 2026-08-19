import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const baseUrl = "https://dist.dcts.community/api/package/rider-cli";
const installDir = path.join(os.homedir(), ".rider-cli");

let binary;

if (os.arch() === "x64") {
    binary = "rider-linux-x64";
} else if (os.arch() === "arm64") {
    binary = "rider-linux-arm64";
} else {
    throw new Error(`Unsupported architecture: ${os.arch()}`);
}

// cleanup old shit if present
fs.rmSync(installDir, {
    recursive: true,
    force: true
});

fs.mkdirSync(installDir, {
    recursive: true
});

const tempPath = path.join(installDir, "rider");
const response = await fetch(`${baseUrl}/${binary}`);

if (!response.ok) {
    throw new Error(`Failed downloading ${binary}`);
}

fs.writeFileSync(tempPath, Buffer.from(await response.arrayBuffer()));
fs.chmodSync(tempPath, 0o755);

try {
    execFileSync("install", ["-m", "755", tempPath, "/usr/local/bin/rider"], {
        stdio: "inherit"
    });
} catch {
    execFileSync("sudo", ["install", "-m", "755", tempPath, "/usr/local/bin/rider"], {
        stdio: "inherit"
    });
}

console.log("Rider CLI installed");