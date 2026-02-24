import { router, userProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import {
  hashBufferSha256,
  sanitizeFilename,
  validateGcodePayload,
} from "@/server/api/utils/print/print.utils";

const printerTypeSchema = z.enum(["PRUSA", "BAMBU"]);

const dispatchToPrinter = async (params: {
  printerType: "PRUSA" | "BAMBU";
  ipAddress: string;
  fileBuffer: Buffer;
  originalFilename: string;
  authToken?: string | null;
  serialNumber?: string | null;
}) => {
  const {
    printerType,
    ipAddress,
    fileBuffer,
    originalFilename,
    authToken,
    serialNumber,
  } = params;

  if (printerType === "PRUSA") {
    if (!authToken) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Prusa printer requires auth token/API key.",
      });
    }

    const uploadForm = new FormData();
    uploadForm.append(
      "file",
      new Blob([fileBuffer], { type: "application/octet-stream" }),
      originalFilename,
    );

    const uploadRes = await fetch(`http://${ipAddress}/api/v1/files/local`, {
      method: "POST",
      headers: {
        "X-Api-Key": authToken,
      },
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const errorBody = await uploadRes.text();
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Prusa upload failed (${uploadRes.status}): ${errorBody}`,
      });
    }

    const startRes = await fetch(`http://${ipAddress}/api/v1/job`, {
      method: "POST",
      headers: {
        "X-Api-Key": authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command: "start",
        path: `/local/${originalFilename}`,
      }),
    });

    if (!startRes.ok) {
      const errorBody = await startRes.text();
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Prusa start failed (${startRes.status}): ${errorBody}`,
      });
    }

    return {
      dispatched: true,
      details: "Uploaded and start command sent to Prusa printer.",
    };
  }

  const bambuBridgeUrl = process.env.BAMBU_BRIDGE_URL;
  if (!bambuBridgeUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Bambu dispatch requires BAMBU_BRIDGE_URL env var (bridge service endpoint).",
    });
  }

  const response = await fetch(bambuBridgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ipAddress,
      serialNumber,
      fileName: originalFilename,
      fileContentBase64: fileBuffer.toString("base64"),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Bambu bridge dispatch failed (${response.status}): ${errorBody}`,
    });
  }

  return {
    dispatched: true,
    details: "File handed off to Bambu bridge service.",
  };
};

export const printRouter = router({
  getPrinters: userProcedure.query(async ({ ctx }) => {
    return ctx.prisma.printer.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  listMyPrintJobs: userProcedure.query(async ({ ctx }) => {
    return ctx.prisma.gcodePrintJob.findMany({
      where: { userId: ctx.user.id },
      include: { printer: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }),

  createPrinter: userProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: printerTypeSchema,
        ipAddress: z.string().ip(),
        authToken: z.string().optional(),
        serialNumber: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.printer.create({
          data: {
            name: input.name,
            type: input.type,
            ipAddress: input.ipAddress,
            authToken: input.authToken,
            serialNumber: input.serialNumber,
            createdByUserId: ctx.user.id,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A printer with this IP address already exists.",
          });
        }

        throw error;
      }
    }),

  uploadAndPrint: userProcedure
    .input(
      z.object({
        printerIpAddress: z.string().ip(),
        fileName: z.string().min(1),
        fileContentBase64: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const printer = await ctx.prisma.printer.findUnique({
        where: { ipAddress: input.printerIpAddress },
      });

      if (!printer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No configured printer found for that IP address.",
        });
      }

      const fileBuffer = Buffer.from(input.fileContentBase64, "base64");

      try {
        validateGcodePayload(input.fileName, fileBuffer);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid G-code payload.",
        });
      }

      const sha256 = hashBufferSha256(fileBuffer);
      const safeName = sanitizeFilename(input.fileName);
      const storedName = `${Date.now()}_${sha256.slice(0, 12)}_${safeName}`;
      const storageRoot = join(process.cwd(), "uploads", "gcodes");
      await mkdir(storageRoot, { recursive: true });
      const storedPath = join(storageRoot, storedName);
      await writeFile(storedPath, fileBuffer);

      const printJob = await ctx.prisma.gcodePrintJob.create({
        data: {
          userId: ctx.user.id,
          printerId: printer.id,
          originalFilename: input.fileName,
          storedFilename: storedName,
          fileHashSha256: sha256,
          fileSizeBytes: fileBuffer.length,
          status: "STORED",
        },
      });

      try {
        const dispatchResult = await dispatchToPrinter({
          printerType: printer.type,
          ipAddress: printer.ipAddress,
          fileBuffer,
          originalFilename: safeName,
          authToken: printer.authToken,
          serialNumber: printer.serialNumber,
        });

        const updated = await ctx.prisma.gcodePrintJob.update({
          where: { id: printJob.id },
          data: {
            status: "DISPATCHED",
            dispatchResponse: dispatchResult.details,
          },
        });

        return updated;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown dispatch error";
        await ctx.prisma.gcodePrintJob.update({
          where: { id: printJob.id },
          data: {
            status: "DISPATCH_FAILED",
            dispatchError: message,
          },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Dispatch failed: ${message}`,
        });
      }
    }),
});
