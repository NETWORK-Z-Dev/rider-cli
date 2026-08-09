import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import Logger from "@hackthedev/terminal-logger";
import {signer} from "./index.mjs";

export async function askPrompt(question) {
    const rl = createInterface({
        input: stdin,
        output: stdout
    });

    const answer = await rl.question(Logger.colors.fgCyan + question + " : " + Logger.colors.fgWhite);
    rl.close();

    return answer;
}

export async function getSessionId(host) {
    if (!host) throw new Error("Host missing");

    const publicKey = await signer.getPublicKey();

    const challenge = await requestChallenge(host, publicKey);
    if (!challenge) return null;

    const sessionId = await solveChallenge(host, challenge, publicKey);
    if (!sessionId) return null;

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

    if (!response.ok) return null;

    return await response.json();
}

async function solveChallenge(host, challengeData, publicKey) {
    const challenge = challengeData.challenge;
    const solution = await signer.decrypt(challenge);

    if (!solution) return null;

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

    if (!response.ok) return null;

    const data = await response.json();
    return data.sessionId ?? null;
}

async function verifySession(host, sessionId, publicKey) {
    const response = await fetch(`${host}/dSyncAuth/verify/session`, {
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            sessionId,
            publicKey
        })
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.error === null;
}