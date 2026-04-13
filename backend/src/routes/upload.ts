import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { uploadToR2 } from "../lib/storage.js";
import multer from "multer";
import path from "path";
import fileType from "file-type";
import heicConvert from "heic-convert";
import * as logger from "../lib/logger.js";

export const uploadRouter = Router();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/epub+zip",
  "audio/mpeg",
  "audio/mp3",
  "video/mp4",
  "video/quicktime",
];
// H9: Enforce limits in multer config (already done but confirm MAX_FILE_SIZE)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Multer en mémoire (buffer) — on envoie ensuite vers R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non supporté: ${file.mimetype}`));
    }
  },
});

// Sanitiser le nom de fichier (supprimer path traversal, caractères spéciaux)
function sanitizeFileName(name: string): string {
  const ext = path.extname(name);
  const base = path.basename(name, ext)
    .replace(/[^a-zA-Z0-9À-ÿ _\-().]/g, "")
    .trim()
    .slice(0, 200);
  return (base || "fichier") + ext.toLowerCase();
}

// Wrap multer to catch its errors and return proper JSON responses
function handleUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ error: "Fichier trop lourd (max 50 Mo)" });
        } else {
          res.status(400).json({ error: "Erreur lors de l'upload du fichier" });
        }
        return resolve();
      }
      if (err instanceof Error) {
        // H3: Ne pas exposer err.message — pourrait contenir des infos internes
        const safe = err.message.startsWith("Type de fichier non supporté") ? err.message : "Erreur lors de l'upload";
        res.status(400).json({ error: safe });
        return resolve();
      }
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

// POST /api/upload — upload fichier vers Cloudflare R2 (auth requise)
uploadRouter.post("/", verifyCsrf, requireAuth, async (req: Request, res: Response) => {
  // Run multer manually so we can catch its errors
  await handleUpload(req, res);
  if (res.headersSent) return;
  try {
    if (!req.file) {
      res.status(400).json({ error: "Aucun fichier envoyé" });
      return;
    }

    // H8: Validate MIME type from actual file content, not just client-reported header
    const detectedType = await fileType.fromBuffer(req.file.buffer);
    const actualMime = detectedType?.mime || req.file.mimetype;
    if (!ALLOWED_FILE_TYPES.includes(actualMime)) {
      res.status(400).json({ error: `Type de fichier non supporté: ${actualMime}` });
      return;
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(actualMime);
    if (isImage && req.file.size > MAX_IMAGE_SIZE) {
      res.status(400).json({ error: "Image trop lourde (max 5 Mo)" });
      return;
    }

    let uploadBuffer = req.file.buffer;
    let uploadMime = actualMime;
    let safeName = sanitizeFileName(req.file.originalname);

    // Convert HEIC/HEIF to JPEG for universal browser compatibility
    if (actualMime === "image/heic" || actualMime === "image/heif") {
      try {
        const converted = await heicConvert({ buffer: req.file.buffer.buffer, format: "JPEG", quality: 0.9 });
        uploadBuffer = Buffer.from(converted);
        uploadMime = "image/jpeg";
        safeName = safeName.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
      } catch (convertErr) {
        logger.error("HEIC conversion failed, uploading original", { error: convertErr instanceof Error ? convertErr.message : "unknown" });
      }
    }

    // N4: Upload vers Cloudflare R2 — returns proxy URL like http://localhost:4000/api/files/key.png
    const fileUrl = await uploadToR2(
      uploadBuffer,
      safeName,
      uploadMime
    );

    // Enregistrer le fichier dans la base de données
    const sellerId = req.seller!.sub;
    // KYC uploads get tagged as "kyc" so they don't appear in the gallery
    const queryPurpose = req.query.purpose as string | undefined;
    const purpose = queryPurpose === "kyc" ? "kyc" : (isImage ? "image" : "file");

    await prisma.fileUpload.create({
      data: {
        sellerId,
        url: fileUrl,
        fileName: safeName,
        fileSize: req.file.size,
        mimeType: actualMime,
        purpose,
      },
    });

    res.json({
      url: fileUrl,
      fileName: safeName,
      size: uploadBuffer.length,
      mimeType: uploadMime,
    });
  } catch (err) {
    // S9: Log full error internally but return generic message to client
    logger.error("Erreur upload", { error: err instanceof Error ? err.message : "Erreur inconnue", stack: err instanceof Error ? err.stack : undefined });
    res.status(500).json({ error: "Erreur lors de l'upload. Réessaye." });
  }
});

// GET /api/upload/images — list seller's uploaded images (for gallery picker)
uploadRouter.get("/images", requireAuth, async (req: Request, res: Response) => {
  try {
    const sellerId = req.seller!.sub;

    const images = await prisma.fileUpload.findMany({
      where: { sellerId, purpose: "image" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        url: true,
        fileName: true,
        fileSize: true,
        createdAt: true,
      },
    });

    res.json({ images });
  } catch (err) {
    logger.error("Erreur liste images", err);
    res.status(500).json({ error: "Erreur lors de la récupération des images" });
  }
});
