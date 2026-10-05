import JSZip from "jszip";
import { createHash } from "node:crypto";
import { badRequest } from "../../../utils/errors.js";

// Shared guards for the file-tools batch (TASK-114a).
export const MAX_ARCHIVE_FILES = 20;
export const MAX_ARCHIVE_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 50;

// Never let user-controlled names become paths or executables inside zips.
const BLOCKED_EXT = new Set(["exe", "msi", "bat", "cmd", "sh", "ps1", "dll", "so", "jar", "apk"]);
const SAFE_NAME = /[^a-zA-Z0-9._-]+/g;

export function extOfName(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? (parts[parts.length - 1] as string) : "";
}

export function safeEntryName(filename: string, index: number, ext: string): string {
  const base = filename
    .split(/[\\/]/)
    .pop()
    ?.replace(SAFE_NAME, "_")
    .replace(/^\.+/, "")
    .slice(0, 100);
  if (!base) return `file_${index}.${ext}`;
  // Preserve a valid extension if the sanitized base lost it.
  return base.includes(".") ? base : `${base}.${ext}`;
}

export function assertCreatable(ext: string): void {
  if (!/^[a-z0-9]{1,10}$/.test(ext)) throw badRequest("Unsupported file type.");
  if (BLOCKED_EXT.has(ext)) throw badRequest(`Executable file type .${ext} is not allowed.`);
}

export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function sha512Hex(data: Buffer): string {
  return createHash("sha512").update(data).digest("hex");
}

export { JSZip };
