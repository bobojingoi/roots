// storage.js — upload imagini în Supabase Storage (S3-compatible), pattern r2.js LocalStay
require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = process.env.S3_BUCKET || 'media';
const ENDPOINT = (process.env.S3_ENDPOINT || '').trim(); // https://<ref>.storage.supabase.co/storage/v1/s3
const REGION = process.env.S3_REGION || 'eu-central-1';

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

// URL public Supabase: <project>.supabase.co/storage/v1/object/public/<bucket>/<key>
function publicUrl(key) {
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
