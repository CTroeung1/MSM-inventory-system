// src/setup/server.js
import { ChildProcess, spawn } from "child_process";

let serverProcess: ChildProcess;
export async function startServer() {
  serverProcess = spawn("ts-node", ["server/index.ts"]);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for server to start
}

export function stopServer() {
  serverProcess.kill();
}
