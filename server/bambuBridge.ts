import { config } from "dotenv";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

config();

type BambuDispatchRequest = {
  ipAddress?: string;
  serialNumber?: string | null;
  authToken?: string | null;
  fileName?: string;
  fileContentBase64?: string;
};

const app = new Hono();
app.use(logger());

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160);

const readJsonArrayEnv = (name: string): string[] => {
  const raw = process.env[name]?.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.some((v) => typeof v !== "string")) {
    throw new Error(`${name} must be a JSON string array.`);
  }
  return parsed;
};

const runExternalDispatch = async (params: {
  ipAddress: string;
  serialNumber: string | null;
  authToken: string;
  fileName: string;
  filePath: string;
}) => {
  const cmd = process.env.BAMBU_BRIDGE_DISPATCH_CMD?.trim();
  if (!cmd) {
    return null;
  }

  const args = readJsonArrayEnv("BAMBU_BRIDGE_DISPATCH_ARGS_JSON");
  const timeoutMs = Number(process.env.BAMBU_BRIDGE_DISPATCH_TIMEOUT_MS ?? 120000);

  return await new Promise<{
    ok: boolean;
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        BAMBU_IP_ADDRESS: params.ipAddress,
        BAMBU_SERIAL_NUMBER: params.serialNumber ?? "",
        BAMBU_ACCESS_CODE: params.authToken,
        BAMBU_FILE_NAME: params.fileName,
        BAMBU_FILE_PATH: params.filePath,
      },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let killedForTimeout = false;

    const timer = setTimeout(() => {
      killedForTimeout = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (killedForTimeout) {
        resolve({
          ok: false,
          exitCode: code,
          stdout,
          stderr: `${stderr}\nTimed out after ${timeoutMs}ms.`.trim(),
        });
        return;
      }
      resolve({
        ok: code === 0,
        exitCode: code,
        stdout,
        stderr,
      });
    });
  });
};

app.get("/", (c) =>
  c.json({
    status: "ok",
    service: "bambu-bridge",
    endpoints: {
      health: "/health",
      dispatch: "/bambu/dispatch (POST)",
    },
    mode: process.env.BAMBU_BRIDGE_MOCK_SUCCESS === "1" ? "mock-success" : "stub",
    adapter:
      process.env.BAMBU_BRIDGE_DISPATCH_CMD?.trim()
        ? "external-command"
        : "none",
  }),
);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "bambu-bridge",
    mode: process.env.BAMBU_BRIDGE_MOCK_SUCCESS === "1" ? "mock-success" : "stub",
  }),
);

app.get("/bambu/dispatch", (c) =>
  c.json(
    {
      error: "Use POST /bambu/dispatch",
      note: "This endpoint accepts JSON and is intended for the inventory app server.",
    },
    405,
  ),
);

app.post("/bambu/dispatch", async (c) => {
  let body: BambuDispatchRequest;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Invalid JSON body." });
  }

  const ipAddress = body.ipAddress?.trim();
  const fileName = body.fileName?.trim();
  const fileContentBase64 = body.fileContentBase64?.trim();
  const serialNumber = body.serialNumber?.trim() ?? null;
  const authToken = body.authToken?.trim() ?? null;

  if (!ipAddress) {
    throw new HTTPException(400, { message: "Missing ipAddress." });
  }
  if (!fileName) {
    throw new HTTPException(400, { message: "Missing fileName." });
  }
  if (!fileContentBase64) {
    throw new HTTPException(400, { message: "Missing fileContentBase64." });
  }
  if (!authToken) {
    throw new HTTPException(400, {
      message: "Missing authToken (Bambu access code) in bridge request.",
    });
  }
  if (!fileName.toLowerCase().endsWith(".3mf")) {
    throw new HTTPException(400, {
      message: "Bambu bridge currently expects a .3mf file.",
    });
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(fileContentBase64, "base64");
  } catch {
    throw new HTTPException(400, { message: "Invalid base64 file content." });
  }

  if (fileBuffer.length === 0) {
    throw new HTTPException(400, { message: "Uploaded file is empty." });
  }

  // Archive requests locally so you can validate app->bridge handoff before wiring
  // actual Bambu transport (MQTT/FTP/etc).
  const inboxDir = join(process.cwd(), "uploads", "bambu-bridge-inbox");
  await mkdir(inboxDir, { recursive: true });
  const storedName = `${Date.now()}_${sanitizeFilename(fileName)}`;
  const storedPath = join(inboxDir, storedName);
  await writeFile(storedPath, fileBuffer);

  if (process.env.BAMBU_BRIDGE_MOCK_SUCCESS === "1") {
    return c.json({
      ok: true,
      mode: "mock-success",
      details:
        "File accepted by local Bambu bridge stub and archived locally. Printer dispatch is not implemented yet.",
      storedFilename: storedName,
      ipAddress,
      serialNumber,
      authTokenPresent: true,
    });
  }

  const externalDispatch = await runExternalDispatch({
    ipAddress,
    serialNumber,
    authToken,
    fileName,
    filePath: storedPath,
  });

  if (externalDispatch) {
    if (externalDispatch.ok) {
      return c.json({
        ok: true,
        mode: "external-command",
        details: "File dispatched via external Bambu bridge command.",
        storedFilename: storedName,
        ipAddress,
        serialNumber,
        authTokenPresent: true,
        commandExitCode: externalDispatch.exitCode,
        commandStdout: externalDispatch.stdout.trim().slice(0, 2000),
      });
    }

    return c.json(
      {
        ok: false,
        mode: "external-command",
        error: "External Bambu dispatch command failed.",
        storedFilename: storedName,
        ipAddress,
        serialNumber,
        authTokenPresent: true,
        commandExitCode: externalDispatch.exitCode,
        commandStdout: externalDispatch.stdout.trim().slice(0, 2000),
        commandStderr: externalDispatch.stderr.trim().slice(0, 2000),
      },
      502,
    );
  }

  return c.json(
    {
      ok: false,
      mode: "stub",
      error:
        "Bambu bridge received and archived the file, but no dispatch adapter is configured. Set BAMBU_BRIDGE_DISPATCH_CMD (or use BAMBU_BRIDGE_MOCK_SUCCESS=1).",
      storedFilename: storedName,
      ipAddress,
      serialNumber,
      authTokenPresent: true,
    },
    501,
  );
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unexpected Bambu bridge error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = Number(process.env.BAMBU_BRIDGE_PORT ?? 8081);

console.log(`Bambu bridge listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
