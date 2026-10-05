import JSZip from "jszip";

// Magic-byte sniffer for the file inspectors (TASK-114b-i). Extension is
// only a hint — detection reads content. Office formats are zip+sentinel;
// anything else zip-shaped reports generic "zip".
export interface SniffedType {
  type: string;
  mime: string;
}

export async function sniffType(buffer: Buffer): Promise<SniffedType> {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e) {
    if (buffer[3] === 0x47) return { type: "png", mime: "image/png" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return { type: "jpeg", mime: "image/jpeg" };
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return { type: "webp", mime: "image/webp" };
  if (buffer.length >= 6) {
    const head = buffer.toString("ascii", 0, 6);
    if (head === "GIF87a" || head === "GIF89a") return { type: "gif", mime: "image/gif" };
  }
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString() === "%PDF-")
    return { type: "pdf", mime: "application/pdf" };
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const names = Object.keys(zip.files);
      if (names.some((n) => n.startsWith("word/")))
        return {
          type: "docx",
          mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
      if (names.some((n) => n.startsWith("xl/")))
        return {
          type: "xlsx",
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      if (names.some((n) => n.startsWith("ppt/")))
        return {
          type: "pptx",
          mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        };
      return { type: "zip", mime: "application/zip" };
    } catch {
      return { type: "unknown", mime: "application/octet-stream" };
    }
  }
  if (buffer.length >= 3 && buffer.toString("ascii", 0, 3) === "ID3")
    return { type: "mp3", mime: "audio/mpeg" };
  // MP4/MOV: "ftyp" box at offset 4.
  if (buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "ftyp")
    return { type: "mp4", mime: "video/mp4" };
  if (!buffer.includes(0)) {
    try {
      const text = buffer.toString("utf8");
      // Printable text only (no control chars except tab/LF/CR).
      // eslint-disable-next-line no-control-regex
      if (/^[\x09\x0a\x0d\x20-\u{10FFFF}]*$/u.test(text))
        return { type: "text", mime: "text/plain" };
    } catch {
      // fall through to unknown
    }
  }
  return { type: "unknown", mime: "application/octet-stream" };
}

export function countTextLines(buffer: Buffer): number | null {
  if (buffer.includes(0)) return null;
  const text = buffer
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trim();
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}
