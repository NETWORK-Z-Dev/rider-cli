#!/usr/bin/env node
// @bun

// node_modules/@hackthedev/dsync-sign/index.mjs
import { promises as fs } from "fs";
import crypto from "crypto";

class dSyncSign {
  constructor(keyFile = "./privatekey.json") {
    this.KEY_FILE = keyFile;
    this.sigField = "sig";
  }
  canonicalize(x) {
    if (x === null || typeof x !== "object")
      return x;
    if (Array.isArray(x))
      return x.map((v) => this.canonicalize(v));
    const out = {};
    for (const k of Object.keys(x).sort())
      out[k] = this.canonicalize(x[k]);
    return out;
  }
  stableStringify(obj) {
    return JSON.stringify(this.canonicalize(obj));
  }
  normalizePublicKey(key) {
    if (!key)
      return key;
    key = String(key).replace(/&lt;br\s*\/?&gt;/gi, `
`).replace(/<br\s*\/?>/gi, `
`).replace(/\r\n/g, `
`).replace(/\r/g, `
`).trim();
    if (key.includes("BEGIN PUBLIC KEY") || key.includes("BEGIN RSA PUBLIC KEY")) {
      key = key.replace(/\n+/g, `
`).replace(/-----BEGIN PUBLIC KEY-----\s*/g, `-----BEGIN PUBLIC KEY-----
`).replace(/-----END PUBLIC KEY-----/g, `
-----END PUBLIC KEY-----`).replace(/-----BEGIN RSA PUBLIC KEY-----\s*/g, `-----BEGIN RSA PUBLIC KEY-----
`).replace(/-----END RSA PUBLIC KEY-----/g, `
-----END RSA PUBLIC KEY-----`);
      const isRsa = key.includes("BEGIN RSA PUBLIC KEY");
      const begin = isRsa ? "-----BEGIN RSA PUBLIC KEY-----" : "-----BEGIN PUBLIC KEY-----";
      const end = isRsa ? "-----END RSA PUBLIC KEY-----" : "-----END PUBLIC KEY-----";
      let body = key.replace(begin, "").replace(end, "").replace(/\s+/g, "");
      body = body.match(/.{1,64}/g)?.join(`
`) || body;
      return `${begin}
${body}
${end}`;
    }
    return key;
  }
  async ensureKeyPair() {
    try {
      const raw = await fs.readFile(this.KEY_FILE, "utf8");
      const { privateKey } = JSON.parse(raw);
      crypto.createPrivateKey(privateKey);
      const pubKey = crypto.createPublicKey(privateKey).export({ type: "spki", format: "pem" });
      return { privateKey, publicKey: pubKey.toString() };
    } catch {
      const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
      });
      await fs.writeFile(this.KEY_FILE, JSON.stringify({ privateKey }, null, 2), { encoding: "utf8", mode: 384 });
      return { privateKey, publicKey };
    }
  }
  async signString(text) {
    const priv = await this.getPrivateKey();
    const signer = crypto.createSign("SHA256");
    signer.update(text, "utf8");
    signer.end();
    return signer.sign(priv, "base64");
  }
  verifyString(text, signatureBase64, publicKeyPem) {
    publicKeyPem = this.normalizePublicKey(publicKeyPem);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(text, "utf8");
    verifier.end();
    return verifier.verify(publicKeyPem, signatureBase64, "base64");
  }
  generateGid(publicKey) {
    if (publicKey.length >= 120) {
      return this.encodeToBase64(publicKey.substring(80, 120));
    } else {
      return this.encodeToBase64(publicKey.substring(0, publicKey.length));
    }
  }
  encodeToBase64(str) {
    return Buffer.from(str, "utf8").toString("base64");
  }
  async getPrivateKey() {
    const { privateKey } = await this.ensureKeyPair();
    return privateKey;
  }
  async getPublicKey() {
    const { publicKey } = await this.ensureKeyPair();
    return publicKey;
  }
  async encrypt(data, recipient) {
    const plaintext = typeof data === "string" ? data : this.stableStringify(data);
    if (typeof recipient === "string") {
      recipient = this.normalizePublicKey(recipient);
    }
    let aesKey;
    let envelope = { method: "" };
    if (typeof recipient === "string" && (recipient.includes("BEGIN PUBLIC KEY") || recipient.includes("BEGIN RSA PUBLIC KEY"))) {
      aesKey = crypto.randomBytes(32);
      envelope.method = "rsa";
      envelope.encKey = crypto.publicEncrypt({ key: recipient, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, aesKey).toString("base64");
    } else {
      const salt = crypto.randomBytes(16);
      aesKey = crypto.pbkdf2Sync(recipient, salt, 1e5, 32, "sha256");
      envelope.method = "password";
      envelope.salt = salt.toString("base64");
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      ...envelope,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ciphertext: ciphertext.toString("base64")
    };
  }
  async decrypt(envelope, password = null) {
    let aesKey;
    if (envelope.method === "rsa") {
      const priv = await this.getPrivateKey();
      aesKey = crypto.privateDecrypt({ key: priv, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(envelope.encKey, "base64"));
    } else if (envelope.method === "password") {
      if (!password)
        throw new Error("Password required for password-based decryption");
      aesKey = crypto.pbkdf2Sync(password, Buffer.from(envelope.salt, "base64"), 1e5, 32, "sha256");
    } else {
      throw new Error("Unsupported envelope method");
    }
    const iv = Buffer.from(envelope.iv, "base64");
    const tag = Buffer.from(envelope.tag, "base64");
    const ciphertext = Buffer.from(envelope.ciphertext, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const txt = dec.toString("utf8");
    try {
      return JSON.parse(txt);
    } catch {
      return txt;
    }
  }
  async signData(data) {
    const priv = await this.getPrivateKey();
    const signer = crypto.createSign("SHA256");
    const payload = typeof data === "string" ? data : this.stableStringify(data);
    signer.update(payload, "utf8");
    signer.end();
    return signer.sign(priv, "base64");
  }
  verifyData(data, signature, publicKey) {
    publicKey = this.normalizePublicKey(publicKey);
    const verifier = crypto.createVerify("SHA256");
    const payload = typeof data === "string" ? data : this.stableStringify(data);
    verifier.update(payload, "utf8");
    verifier.end();
    return verifier.verify(publicKey, signature, "base64");
  }
  getByPath(root, path) {
    if (!path)
      return root;
    const re = /([^.\[\]]+)|\[(\d+)\]/g;
    const parts = [];
    let m;
    while ((m = re.exec(path)) !== null)
      parts.push(m[1] !== undefined ? m[1] : Number(m[2]));
    let cur = root;
    for (const p of parts) {
      if (cur == null)
        return;
      cur = cur[p];
    }
    return cur;
  }
  cloneWithoutSig(obj) {
    if (obj == null || typeof obj !== "object")
      return obj;
    let copy;
    if (typeof structuredClone === "function") {
      try {
        copy = structuredClone(obj);
      } catch {
        copy = JSON.parse(JSON.stringify(obj));
      }
    } else {
      copy = JSON.parse(JSON.stringify(obj));
    }
    if (copy && Object.prototype.hasOwnProperty.call(copy, this.sigField))
      delete copy[this.sigField];
    return copy;
  }
  async signJson(targetOrRoot, path) {
    let target = path ? this.getByPath(targetOrRoot, path) : targetOrRoot;
    if (target == null) {
      if (path)
        return false;
      throw new TypeError("target required");
    }
    if (Array.isArray(target)) {
      const out = [];
      for (const item of target) {
        if (item == null || typeof item !== "object") {
          out.push(null);
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(item, this.sigField)) {
          out.push(item[this.sigField]);
          continue;
        }
        const payload = this.cloneWithoutSig(item);
        const s = await this.signData(payload);
        item[this.sigField] = s;
        out.push(s);
      }
      return out;
    }
    if (typeof target === "object") {
      if (Object.prototype.hasOwnProperty.call(target, this.sigField))
        return target[this.sigField];
      const payload = this.cloneWithoutSig(target);
      const s = await this.signData(payload);
      target[this.sigField] = s;
      return s;
    }
    throw new TypeError("target must be object or array");
  }
  async verifyJson(targetOrRoot, publicKeyOrGetter, path) {
    let target = path ? this.getByPath(targetOrRoot, path) : targetOrRoot;
    if (target == null) {
      if (path)
        return false;
      throw new TypeError("target required");
    }
    if (Array.isArray(target)) {
      const out = [];
      for (const item of target) {
        if (item == null || typeof item !== "object") {
          out.push(false);
          continue;
        }
        if (!Object.prototype.hasOwnProperty.call(item, this.sigField)) {
          out.push(false);
          continue;
        }
        const signature = item[this.sigField];
        let pub = publicKeyOrGetter;
        if (typeof publicKeyOrGetter === "function")
          pub = await publicKeyOrGetter(item, targetOrRoot);
        if (!pub) {
          out.push(false);
          continue;
        }
        const payload = this.cloneWithoutSig(item);
        out.push(Boolean(this.verifyData(payload, signature, pub)));
      }
      return out;
    }
    if (typeof target === "object") {
      if (!Object.prototype.hasOwnProperty.call(target, this.sigField))
        return false;
      const signature = target[this.sigField];
      let pub = publicKeyOrGetter;
      if (typeof publicKeyOrGetter === "function")
        pub = await publicKeyOrGetter(target, targetOrRoot);
      if (!pub)
        return false;
      const payload = this.cloneWithoutSig(target);
      return Boolean(this.verifyData(payload, signature, pub));
    }
    throw new TypeError("target must be object or array");
  }
}

// index.mjs
import os from "os";
import path4 from "path";

// helpers.mjs
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";

// node_modules/@hackthedev/terminal-logger/index.mjs
import fs2 from "fs";

class Logger {
  static logDebug = false;
  static colors = {
    reset: "\x1B[0m",
    bright: "\x1B[1m",
    dim: "\x1B[2m",
    underscore: "\x1B[4m",
    blink: "\x1B[5m",
    reverse: "\x1B[7m",
    hidden: "\x1B[8m",
    fgBlack: "\x1B[30m",
    fgRed: "\x1B[31m",
    fgGreen: "\x1B[32m",
    fgYellow: "\x1B[33m",
    fgBlue: "\x1B[34m",
    fgMagenta: "\x1B[35m",
    fgCyan: "\x1B[36m",
    fgWhite: "\x1B[37m",
    fgGray: "\x1B[90m",
    bgBlack: "\x1B[40m",
    bgRed: "\x1B[41m",
    bgGreen: "\x1B[42m",
    bgYellow: "\x1B[43m",
    bgBlue: "\x1B[44m",
    bgMagenta: "\x1B[45m",
    bgCyan: "\x1B[46m",
    bgWhite: "\x1B[47m"
  };
  static log(level, message, color = Logger.colors.fgWhite) {
    if (message instanceof Error) {
      Logger.printErrorWithFrame(level, message, color);
      return;
    }
    console.log(`${color}${Logger.displayDate()}[${level}] ${message}${Logger.colors.reset}`);
  }
  static printErrorWithFrame(level, err, color) {
    const reset = Logger.colors.reset;
    console.log(`${color}${Logger.displayDate()}[${level}] ${err.name}: ${err.message}${reset}`);
    if (!err.stack)
      return;
    const stackLines = err.stack.split(`
`);
    const firstFrame = stackLines.find((l) => l.includes("(") && l.includes(":"));
    const match = firstFrame?.match(/\((.*):(\d+):(\d+)\)/);
    if (!match) {
      console.log(`${color}${err.stack}${reset}`);
      return;
    }
    const [, file, lineStr, colStr] = match;
    const line = parseInt(lineStr, 10);
    const col = parseInt(colStr, 10);
    try {
      const lines = fs2.readFileSync(file, "utf8").split(`
`);
      const start = Math.max(0, line - 3);
      const end = Math.min(lines.length, line + 2);
      for (let i = start;i < end; i++) {
        const ln = String(i + 1).padStart(3, " ");
        console.log(`${color}${ln} | ${lines[i]}${reset}`);
        if (i + 1 === line) {
          console.log(`${color}    | ${" ".repeat(Math.max(col - 1, 0))}^${reset}`);
        }
      }
    } catch {}
    for (const l of stackLines.slice(1)) {
      console.log(`${color}${l}${reset}`);
    }
  }
  static space(amount = 1) {
    for (let i = 0;i < amount; i++)
      console.log(" ");
  }
  static info(message, color = "") {
    Logger.log("INFO", message, color ? Logger.colors.fgCyan + color : Logger.colors.fgCyan);
  }
  static success(message, color = "") {
    Logger.log("SUCCESS", message, color ? Logger.colors.fgGreen + color : Logger.colors.fgGreen);
  }
  static warn(message, color = "") {
    Logger.log("WARN", message, color ? Logger.colors.fgYellow + color : Logger.colors.fgYellow);
  }
  static error(message, color = "") {
    Logger.log("ERROR", message, color ? Logger.colors.fgRed + color : Logger.colors.fgRed);
  }
  static debug(message, color = "") {
    if (!Logger.logDebug)
      return;
    Logger.log("DEBUG", message, color ? Logger.colors.bright + Logger.colors.fgBlack + color : Logger.colors.bright + Logger.colors.fgBlack);
  }
  static displayDate() {
    const d = new Date;
    const date = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const time = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
    return `[${date} ${time}] `;
  }
}

// helpers.mjs
async function askPrompt(question) {
  const rl = createInterface({
    input: stdin,
    output: stdout
  });
  const answer = await rl.question(Logger.colors.fgCyan + question + " : " + Logger.colors.fgWhite);
  rl.close();
  return answer;
}
async function getSessionId(host) {
  if (!host)
    throw new Error("Host missing");
  const publicKey = await signer.getPublicKey();
  const challenge = await requestChallenge(host, publicKey);
  if (!challenge)
    return null;
  const sessionId = await solveChallenge(host, challenge, publicKey);
  if (!sessionId)
    return null;
  return sessionId;
}
async function requestChallenge(host, publicKey) {
  const response = await fetch(`${host}/dSyncAuth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      publicKey
    })
  });
  if (!response.ok)
    return null;
  return await response.json();
}
async function solveChallenge(host, challengeData, publicKey) {
  const challenge = challengeData.challenge;
  const solution = await signer.decrypt(challenge);
  if (!solution)
    return null;
  const response = await fetch(`${host}/dSyncAuth/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      identifier: challengeData.identifier,
      solution,
      publicKey
    })
  });
  if (!response.ok)
    return null;
  const data = await response.json();
  return data.sessionId ?? null;
}

// api/package/init.mjs
import * as fs4 from "fs";

// api/package/helpers.mjs
import fs3 from "fs";
import path from "path";
import crypto2 from "crypto";
function hasPackageConfigFile() {
  if (!fs3.existsSync(getPackageConfigPath())) {
    return false;
  } else if (fs3.existsSync(getPackageConfigPath())) {
    return true;
  }
}
function getPackageConfigPath() {
  return path.join(currentDir, "package.json");
}
function getPackageConfigObj() {
  return JSON.parse(fs3.readFileSync(getPackageConfigPath(), "utf8"));
}
function setPackageConfigObj(packageObj) {
  if (!packageObj)
    throw new Error("Missing package object");
  if (typeof packageObj !== "object")
    throw new Error("Supplied parameter is not a json object");
  fs3.writeFileSync(getPackageConfigPath(), JSON.stringify(packageObj, null, 4));
}
function getPackageHost() {
  return "https://dist.dcts.community";
}
function getPackageUrl(identifier) {
  if (!identifier)
    throw new Error("Missing identifier");
  return `${getPackageHost()}/api/package/${identifier}`;
}
async function uploadFile(filePath, {
  authObj = {},
  onProgress = null,
  params = {},
  type = "upload",
  host = null,
  includeDir = false
} = {}) {
  const stat = fs3.statSync(filePath);
  const chunkSize = 1024 * 256;
  const totalChunks = Math.ceil(stat.size / chunkSize);
  const fileId = crypto2.randomUUID();
  const file = fs3.openSync(filePath, "r");
  const filename = path.basename(filePath);
  let relativePath = path.relative(currentDir, filePath);
  for (let i = 0;i < totalChunks; i++) {
    const size = Math.min(chunkSize, stat.size - i * chunkSize);
    const buffer = Buffer.alloc(size);
    fs3.readSync(file, buffer, 0, size, i * chunkSize);
    const res = await fetch(`${host}/api/upload?${new URLSearchParams(params)}`, {
      method: "POST",
      headers: {
        ...authObj,
        "x-upload-type": type,
        "x-file-name": encodeURIComponent(filename),
        "x-file-path": includeDir === true ? encodeURIComponent(relativePath) : null,
        "x-chunk-index": i,
        "x-total-chunks": totalChunks,
        "x-file-id": fileId
      },
      body: buffer
    });
    const json = await res.json();
    if (!json.ok) {
      fs3.closeSync(file);
      return json;
    }
    if (onProgress) {
      await onProgress(Math.round((i + 1) / totalChunks * 100));
    }
    if (json.path) {
      fs3.closeSync(file);
      return json;
    }
  }
  fs3.closeSync(file);
  return { ok: true };
}

// api/package/init.mjs
async function initPackage() {
  let packageConfigPath = getPackageConfigPath();
  let hasConfig = hasPackageConfigFile();
  if (hasConfig) {
    Logger.warn("Config file (package.json) already exists");
    Logger.warn(`Location: ${packageConfigPath}`);
    return;
  }
  let packageName = await askPrompt("Whats your package name?");
  if (!packageName || packageName.trim().length === 0)
    return Logger.error("You need to enter a valid project name!");
  let version = await askPrompt("Enter a version (1.0.0)");
  if (!version)
    version = "1.0.0";
  let license = await askPrompt("Enter a license (NONE)");
  if (!license)
    license = "NONE";
  let packageConfig = {
    name: packageName,
    version,
    license
  };
  if (!fs4.existsSync(packageConfigPath)) {
    fs4.writeFileSync(packageConfigPath, packageConfig);
    Logger.success("Package Config file has been setup!");
  }
}

// api/package/publish.mjs
import fs5 from "fs";
import path2 from "path";
async function publishPackage() {
  let packageConfig = getPackageConfigObj();
  let files = fs5.readdirSync(currentDir, { withFileTypes: true, recursive: true });
  if (!checkFileArrayLength(files))
    return;
  let filteredFiles = [];
  let ignoreList = [
    "node_modules",
    "rider_modules",
    ".git",
    ".idea"
  ];
  for (let file of files) {
    let fileName = file.name;
    let filePath = path2.join(file?.path ?? file.parentPath, file.name);
    if (!ignoreList.some((ignore) => filePath.includes(ignore) || fileName.includes(ignore))) {
      filteredFiles.push(file);
    }
  }
  if (!checkFileArrayLength(filteredFiles))
    return;
  Logger.info(`Uploading ${filteredFiles?.length ?? 0} files...`);
  for (let file of filteredFiles) {
    let fileName = file.name;
    let filePath = path2.join(file?.path ?? file.parentPath, file.name);
    let isFile = file.isFile();
    if (!isFile)
      continue;
    let result = await uploadFile(filePath, {
      host: getPackageHost(),
      authObj: {
        "x-session-id": await getSessionId(getPackageHost()),
        "x-public-key": encodeURIComponent(await signer.getPublicKey())
      },
      params: {
        type: "package",
        name: packageConfig.name,
        version: packageConfig.version,
        isPublic: 1
      },
      includeDir: true
    });
    let uploaded = result?.ok === true && result?.path;
    if (!uploaded) {
      Logger.error(`Failed to upload file ${fileName}`);
      Logger.error(result?.error);
    }
  }
  function checkFileArrayLength(arr) {
    if (!arr)
      throw new Error("No array passed!");
    if (arr.length === 0) {
      Logger.error("No files found to publish");
      return false;
    } else {
      return true;
    }
  }
}

// api/package/install.mjs
import path3 from "path";
import fs6 from "fs";
async function installPackage(identifier, customPath = null) {
  if (!identifier)
    throw new Error("Missing package identifier");
  let packageInfo = await getPackageDetails(identifier);
  if (packageInfo?.error) {
    Logger.error(`Unable to install package: ${identifier} - Unable to fetch details`);
    Logger.error(packageInfo.error);
    return {
      error: `Unable to install package ${identifier} - Unable to fetch details`
    };
  }
  let packageObj = packageInfo?.package;
  if (packageObj?.name) {
    Logger.info(`Installing package '${Logger.colors.fgYellow}@${packageObj.account.username}/${identifier}${Logger.colors.fgCyan}'`);
    let fileUrl = `${getPackageHost(identifier)}/${packageObj.meta.paths.files}/no-version`;
    if (!fileUrl)
      return {
        error: `Unable to fetch package files ${identifier}`
      };
    let fileInfo = await getPackageFiles(fileUrl);
    let fileListObj = fileInfo?.files;
    if (fileListObj.length === 0)
      return {
        error: `No files found for ${identifier}`
      };
    for (let file of fileListObj) {
      let fileDownloadUrl = `${getPackageUrl(packageObj.name)}/${file}`;
      let localFilePath = customPath ? path3.join(customPath, packageObj.name, file) : path3.join(currentDir, "rider_modules", packageObj.name, file);
      await checkLocalPackagePath(localFilePath);
      await downloadFile(fileDownloadUrl, localFilePath);
    }
    Logger.success(`Installed package '${Logger.colors.fgYellow}@${packageObj.account.username}/${identifier}${Logger.colors.fgCyan}'`);
  } else {
    Logger.error("Missing package data?");
    return {
      error: "Missing package data?"
    };
  }
}
async function downloadFile(url, targetPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs6.writeFileSync(targetPath, buffer);
  return targetPath;
}
async function getPackageDetails(identifier) {
  if (!identifier)
    throw new Error("Missing package identifier");
  let infoRes = await fetch(getPackageUrl(identifier), {
    signal: AbortSignal.timeout(2500)
  });
  if (infoRes.status !== 200) {
    return {
      error: "Unable to fetch package details for " + identifier,
      response: infoRes
    };
  }
  let rawJsonData = await infoRes.json();
  return {
    package: rawJsonData?.package,
    error: null,
    response: infoRes
  };
}
async function getPackageFiles(url) {
  if (!url)
    throw new Error("Missing package url");
  let filesRes = await fetch(url, {
    signal: AbortSignal.timeout(2500)
  });
  if (filesRes.status !== 200) {
    return {
      error: "Unable to fetch package files for " + url,
      response: filesRes,
      files: null
    };
  }
  let rawJsonData = await filesRes.json();
  return {
    files: rawJsonData?.files,
    error: null,
    response: filesRes
  };
}
async function checkLocalPackagePath(filePath) {
  if (!filePath)
    throw new Error("Missing package identifier");
  let folderPath = path3.dirname(filePath);
  if (!fs6.existsSync(folderPath))
    fs6.mkdirSync(folderPath, { recursive: true });
}

// api/package/bump.mjs
import fs7 from "fs";
async function bumpPackageVersion() {
  if (!fs7.existsSync(getPackageConfigPath()))
    return Logger.error("No package.json config file found :/");
  let packageConfig = getPackageConfigObj();
  let rawVersion = packageConfig?.version;
  if (!rawVersion)
    return Logger.error("Missing version key in package.json");
  if (rawVersion.indexOf(".") === -1)
    return Logger.error("Only supporting version numbers with minimum 1 '.' - Example: 1.0, 10.1220.984.45, ...");
  let versionArr = rawVersion.split(".").filter((char) => char !== ".");
  let parsedVersionNumber = BigInt(versionArr.join(""));
  let newVersionNumber = ++parsedVersionNumber;
  let newVersionFormatted = String(newVersionNumber).split("").join(".");
  packageConfig.version = newVersionFormatted;
  setPackageConfigObj(packageConfig);
  Logger.success(`Package version was bumped from ${rawVersion} to ${newVersionFormatted}`);
}

// index.mjs
var appDir = path4.join(os.homedir(), "rider-cli");
var currentDir = process.cwd();
var keyFile = path4.join(os.homedir(), "cli-key.json");
var signer = new dSyncSign(keyFile);
await signer.ensureKeyPair();
var [, , command, ...args] = process.argv;
switch (command) {
  case "init":
    await initPackage();
    break;
  case "publish":
    await publishPackage();
    break;
  case "install":
    await installPackage(args[0], args[1] ?? null);
    break;
  case "key":
    console.log(await signer.getPublicKey());
    break;
  case "gid":
    console.log(await signer.generateGid(await signer.getPublicKey()));
    break;
  case "bump":
    await bumpPackageVersion();
    break;
  default:
    console.log(`Unkown command: ${command}`);
}
export {
  signer,
  currentDir
};
