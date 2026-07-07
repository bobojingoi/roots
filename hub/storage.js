// storage.js — upload imagini pe storage S3-compatible (Cloudflare R2 sau Supabase Storage).
// R2 (recomandat): S3_ENDPOINT = https://<account_id>.r2.cloudflarestorage.com,
//   S3_REGION = auto, S3_PUBLIC_BASE = domeniul public al bucketului (r2.dev sau custom).
// Supabase: S3_ENDPOINT = https://<ref>.storage.supabase.co/storage/v1/s3 (fără S3_PUBLIC_BASE).
require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = process.env.S3_BUCKET || 'media';
const ENDPOINT = (process.env.S3_ENDPOINT || '').trim();
const REGION = process.env.S3_REGION || 'auto';
const PUBLIC_BASE = (process.env.S3_PUBLIC_BASE || '').trim().replace(/\/$/, '');

const client = ENDPOINT
  ? new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    })
  : null;

function storageReady() {
  return Boolean(client && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

function publicUrl(key) {
  // R2 / orice storage cu domeniu public dedicat
  if (PUBLIC_BASE) return `${PUBLIC_BASE}/${key}`;
  // fallback Supabase: <project>.supabase.co/storage/v1/object/public/<bucket>/<key>
  const base = ENDPOINT.replace(/\/s3\/?$/, '');
  return `${base}/object/public/${BUCKET}/${key}`;
}

async function putObject(key, body, contentType) {
  if (!storageReady()) throw new Error('Storage neconfigurat (S3_* lipsesc din env).');
  await client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
  return publicUrl(key);
}

module.exports = { putObject, storageReady, publicUrl };
