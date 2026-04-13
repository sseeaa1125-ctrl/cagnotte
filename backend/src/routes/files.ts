import { Router, type Request, type Response } from "express";
import { Readable } from "stream";
import { streamFromR2 } from "../lib/storage.js";

export const filesRouter = Router();

// GET /api/files/:key — proxy R2 files publicly (no auth needed)
// A17: Streams files from R2 instead of buffering entire file in memory
// Allowed extensions whitelist
const SAFE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "zip", "rar", "epub", "mp3", "mp4", "mov"]);

filesRouter.get("/:key", async (req: Request, res: Response) => {
  const key = req.params.key as string;

  // Strict validation: 32-char hex + dot + whitelisted extension only
  const match = key.match(/^([a-f0-9]{32})\.([a-z0-9]+)$/);
  if (!match || !SAFE_EXTENSIONS.has(match[2])) {
    res.status(400).json({ error: "Clé de fichier invalide" });
    return;
  }

  // A17: Stream from R2 instead of buffering entire file in memory
  const file = await streamFromR2(key);
  if (!file) {
    res.status(404).json({ error: "Fichier introuvable" });
    return;
  }

  // Cache for 1 year (immutable content-addressed keys)
  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (file.contentLength) {
    headers["Content-Length"] = String(file.contentLength);
  }
  res.set(headers);

  // Pipe the S3 stream directly to the response
  const nodeStream = Readable.from(file.body);
  nodeStream.pipe(res);
});
