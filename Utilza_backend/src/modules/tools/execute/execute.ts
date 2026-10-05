import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import multer from "multer";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../lib/logger.js";
import { tempStorage, DEFAULT_TTL_MS } from "../../../lib/storage.js";
import { asyncHandler, sendSuccess } from "../../../utils/handler.js";
import { badRequest } from "../../../utils/errors.js";
import type { AuthRequest } from "../../../middleware/auth.middleware.js";

// Shared execute flow for file-based backend tools (06 §10–11):
// validate → temp id → process → temp storage → GeneratedFile row → result.
// Every Wave 1+ tool reuses this; only `process` differs per tool.
export const MAX_TOOL_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file

export function toolUpload(maxFiles: number, maxBytes = MAX_TOOL_FILE_BYTES) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: maxFiles },
  });
}

export interface ToolFileInput {
  buffer: Buffer;
  ext: string;
  mimeType: string;
  size: number;
}

export interface ToolProcessResult {
  buffer: Buffer;
  ext: string;
  mimeType: string;
}

export function extOf(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? (parts[parts.length - 1] as string) : "";
}

// Defense in depth: extension allowlist + size range. Never trusts MIME alone.
function toInputs(
  files: Express.Multer.File[] | undefined,
  allowedExts: Set<string>,
  maxBytes: number,
): ToolFileInput[] {
  if (!files || files.length === 0) throw badRequest("At least one file upload is required.");
  return files.map((f) => {
    const ext = extOf(f.originalname);
    if (!allowedExts.has(ext)) throw badRequest(`Unsupported file type: .${ext || "unknown"}`);
    if (f.size <= 0 || f.size > maxBytes) throw badRequest("File size out of range.");
    return { buffer: f.buffer, ext, mimeType: f.mimetype, size: f.size };
  });
}

export interface FileToolConfig {
  toolSlug: string;
  maxFiles: number;
  maxBytes?: number;
  allowedExts: string[];
  // Pure transform: inputs → output bytes. No storage/DB access inside;
  // the helper owns temp ids, storage, GeneratedFile rows and the response.
  process: (inputs: ToolFileInput[], jobId: string) => Promise<ToolProcessResult>;
}

export interface FileToolResult {
  jobId: string;
  fileId: string;
  downloadUrl: string;
  mimeType: string;
  size: number;
  expiresAt: string;
}

export { DEFAULT_TTL_MS };

export function createFileToolHandler(config: FileToolConfig) {
  const allowed = new Set(config.allowedExts.map((e) => e.toLowerCase()));
  const maxBytes = config.maxBytes ?? MAX_TOOL_FILE_BYTES;
  const upload = toolUpload(config.maxFiles, maxBytes);
  return [
    upload.array("files", config.maxFiles),
    asyncHandler(async (req: Request, res: Response) => {
      const files = (req as Request & { files?: Express.Multer.File[] }).files;
      const inputs = toInputs(files, allowed, maxBytes);
      const jobId = randomUUID();
      const result = await config.process(inputs, jobId);
      const stored = await tempStorage.put(result.buffer, {
        ext: result.ext,
        mimeType: result.mimeType,
      });
      const row = await prisma.generatedFile.create({
        data: {
          userId: (req as AuthRequest).user?.id ?? null,
          toolSlug: config.toolSlug,
          storageKey: stored.key,
          mimeType: result.mimeType,
          size: result.buffer.length,
          status: "ready",
          expiresAt: stored.expiresAt,
        },
      });
      logger.info(
        { jobId, tool: config.toolSlug, files: inputs.length, size: result.buffer.length },
        "tool executed",
      );
      const payload: FileToolResult = {
        jobId,
        fileId: row.id,
        downloadUrl: `/api/v1/files/${row.id}`,
        mimeType: result.mimeType,
        size: result.buffer.length,
        expiresAt: stored.expiresAt.toISOString(),
      };
      sendSuccess(res, payload);
    }),
  ];
}
