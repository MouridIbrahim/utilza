import { Router } from "express";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import { sniffType } from "../sniff.js";

export const fileTypeRouter = Router();

// POST /file/type — any single file (≤10MB) → {type, mime} from content
// sniffing. Extension is ignored entirely.
fileTypeRouter.post(
  "/",
  toolUpload(2).single("files"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    sendSuccess(res, await sniffType(file.buffer));
  }),
);
