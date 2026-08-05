import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import Logger from "@hackthedev/terminal-logger";

export async function askPrompt(question) {
    const rl = createInterface({
        input: stdin,
        output: stdout
    });

    const answer = await rl.question(Logger.colors.fgCyan + question + " : " + Logger.colors.fgWhite);
    rl.close();

    return answer;
}