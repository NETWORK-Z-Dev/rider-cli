import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// i should turn this into a setting at some point so people can change hosts
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

// download some shit
const targetPath = path.join(installDir, binary);
const response = await fetch(`${baseUrl}/${binary}`);

if (!response.ok) {
    throw new Error(`Failed downloading ${binary}`);
}

const buffer = Buffer.from(await response.arrayBuffer());
fs.writeFileSync(targetPath, buffer);
fs.chmodSync(targetPath, 0o755);

// create sym link so its nicer to use n shit, well prepair it actually
const bunDir = path.dirname(process.execPath);
let riderLink;

// only relevant for linux. this shit is annoying me so much
if(process.platform === "linux"){
    const binDir = path.join(os.homedir(), ".local", "bin");
    riderLink = path.join(binDir, "rider");

    fs.mkdirSync(binDir, {
        recursive: true
    });

    const shell = process.env.SHELL || "";
    const shellConfig = shell.includes("zsh")
        ? path.join(os.homedir(), ".zshrc")
        : path.join(os.homedir(), ".bashrc");

    const pathLine = `export PATH="$HOME/.local/bin:$PATH"`;

    let shellConfigContent = fs.existsSync(shellConfig)
        ? fs.readFileSync(shellConfig, "utf8")
        : "";

    if(!shellConfigContent.includes(pathLine)){
        fs.appendFileSync(shellConfig, `\n${pathLine}\n`);
    }

    process.env.PATH = `${binDir}:${process.env.PATH}`;
}
else{
    riderLink = path.join(bunDir, "rider");
}

// preay
try {
    fs.unlinkSync(riderLink);
} catch {}

fs.symlinkSync(targetPath, riderLink);



console.log("Rider CLI installed");