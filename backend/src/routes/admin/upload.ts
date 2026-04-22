import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fileType from "file-type";
import heicConvert from "heic-convert";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { uploadToR2 } from "../../lib/storage.js";
import { logAdminAction } from "../../lib/adminLog.js";
import * as logger from "../../lib/logger.js";

// ── Admin-side upload endpoint ──
// Sert à l'édition admin des cagnottes (`/admin/cagnottes/:id/modifier`) : le
// form admin n'a pas de cookie `izy-token` seller, donc il ne peut pas
// utiliser `/api/upload` qui exige `requireAuth`. Ce endpoint reproduit les
// mêmes garanties (MIME sniff via file-type, HEIC→JPEG, caps taille) mais
// protégé par `requireAdmin`.
//
// Différences intentionnelles avec `/api/upload` :
// - Pas de création de `FileUpload` row : l'upload admin est one-shot (on
//   écrit l'URL dans `config.coverUrl` / `config.gallery` directement) et
//   ne doit pas apparaître dans le gallery picker d'un seller. Si jamais
//   on veut l'attribuer à un seller, passer `sellerId` en query.
// - Log AdminLog `ADMIN_UPLOAD` avec {fileName, size, mimeType} — traçable
//   dans /admin/logs, aligné avec la reco audit-037 sur les exports CSV.
export const adminUploadRouter = Router();

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non supporté: ${file.mimetype}`));
    }
  },
});

function sanitizeFileName(name: string): string {
  const ext = path.extname(name);
  const base = path
    .basename(name, ext)
    .replace(/[^a-zA-Z0-9À-ÿ _\-().]/g, "")
    .trim()
    .slice(0, 200);
  return (base || "fichier") + ext.toLowerCase();
}

function handleUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ error: "Image trop lourde (max 5 Mo)" });
        } else {
          res.status(400).json({ error: "Erreur lors de l'upload du fichier" });
        }
        return resolve();
      }
      if (err instanceof Error) {
        const safe = err.message.startsWith("Type de fichier non supporté")
          ? err.message
          : "Erreur lors de l'upload";
        res.status(400).json({ error: safe });
        return resolve();
      }
      if (err) return reject(err);
      resolve();
    });
  });
}

adminUploadRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  await handleUpload(req, res);
  if (res.headersSent) return;
  try {
    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier envoyé" });
      return;
    }

    const detectedType = await fileType.fromBuffer(req.file.buffer);
    const actualMime = detectedType?.mime || req.file.mimetype;
    if (!ALLOWED_IMAGE_TYPES.includes(actualMime)) {
      res.status(400).json({ error: `Type de fichier non supporté: ${actualMime}` });
      return;
    }
    if (req.file.size > MAX_IMAGE_SIZE) {
      res.status(400).json({ error: "Image trop lourde (max 5 Mo)" });
      return;
    }

    let uploadBuffer = req.file.buffer;
    let uploadMime = actualMime;
    let safeName = sanitizeFileName(req.file.originalname);

    if (actualMime === "image/heic" || actualMime === "image/heif") {
      try {
        const converted = await heicConvert({
          buffer: req.file.buffer.buffer,
          format: "JPEG",
          quality: 0.9,
        });
        uploadBuffer = Buffer.from(converted);
        uploadMime = "image/jpeg";
        safeName = safeName.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
      } catch (convertErr) {
        logger.error("HEIC conversion failed, uploading original", {
          error: convertErr instanceof Error ? convertErr.message : "unknown",
        });
      }
    }

    const fileUrl = await uploadToR2(uploadBuffer, safeName, uploadMime);

    logAdminAction(
      req.admin!.id,
      "ADMIN_UPLOAD",
      "file",
      { fileName: safeName, size: uploadBuffer.length, mimeType: uploadMime },
      req.ip,
    ).catch((err) => logger.error("admin:upload audit", err));

    res.json({
      url: fileUrl,
      fileName: safeName,
      size: uploadBuffer.length,
      mimeType: uploadMime,
    });
  } catch (err) {
    logger.error("Erreur upload admin", {
      error: err instanceof Error ? err.message : "Erreur inconnue",
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json({ error: "Erreur lors de l'upload. Réessaye." });
  }
});
