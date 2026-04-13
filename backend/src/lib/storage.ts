import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";
import crypto from "crypto";
import path from "path";
import * as logger from "./logger.js";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;

const isR2Configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL && R2_BUCKET_NAME);

if (!isR2Configured) {
  logger.warn("R2 credentials manquants — les uploads ne fonctionneront pas.");
}

let s3: S3Client | null = null;
if (isR2Configured) {
  s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    requestHandler: new NodeHttpHandler({
      httpsAgent: new https.Agent({
        maxSockets: 200,
        keepAlive: true,
      }),
      connectionTimeout: 5000,
      socketTimeout: 30000,
    }),
  });
  logger.log(`✅ R2 configuré — bucket: ${R2_BUCKET_NAME}, url: ${R2_PUBLIC_URL}`);
}

/**
 * Upload un fichier vers Cloudflare R2
 * Pas de fallback local — R2 est obligatoire
 * @returns URL publique du fichier
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  if (!s3 || !isR2Configured) {
    throw new Error("R2 non configuré — impossible d'uploader. Vérifiez vos variables d'environnement R2.");
  }

  const ext = path.extname(originalName);
  const key = `${crypto.randomBytes(16).toString("hex")}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    })
  );

  // Return proxy URL that serves through the backend (R2 public URLs return 401)
  const proxyUrl = `${BACKEND_URL}/api/files/${key}`;
  logger.log("Upload R2 OK", { key, mimeType, size: fileBuffer.length, proxyUrl });
  return proxyUrl;
}

/**
 * Supprime un fichier de Cloudflare R2
 */
/**
 * Récupère un fichier depuis Cloudflare R2
 * @returns { buffer, contentType } ou null si introuvable
 */
export async function getFromR2(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!s3 || !isR2Configured) return null;

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    if (!res.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return {
      buffer: Buffer.concat(chunks),
      contentType: res.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

/**
 * Extrait la clé R2 depuis une URL (proxy ou directe)
 */
export function extractR2Key(fileUrl: string): string | null {
  // Format proxy: /api/files/abc123.png or full URL with /api/files/
  const proxyMatch = fileUrl.match(/\/api\/files\/([a-f0-9]+\.\w+)/);
  if (proxyMatch) return proxyMatch[1];
  // Format R2 direct: https://pub-xxx.r2.dev/abc123.png
  const r2Match = fileUrl.replace(`${R2_PUBLIC_URL}/`, "");
  if (r2Match !== fileUrl && r2Match.length > 0) return r2Match;
  // Just a key
  if (/^[a-f0-9]+\.\w+$/.test(fileUrl)) return fileUrl;
  return null;
}

/**
 * A17: Stream a file from R2 without buffering the entire file in memory.
 * Returns the S3 response with a readable stream Body, or null if not found.
 */
export async function streamFromR2(key: string) {
  if (!s3 || !isR2Configured) return null;

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    if (!res.Body) return null;
    return {
      body: res.Body as AsyncIterable<Uint8Array> & { transformToWebStream?: () => ReadableStream },
      contentType: res.ContentType || "application/octet-stream",
      contentLength: res.ContentLength,
    };
  } catch {
    return null;
  }
}
