import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

const ENABLED = !!(process.env.AWS_ACCESS_KEY_ID && process.env.BUCKET_NAME);

let s3 = null;

if (ENABLED) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log(`[tigris] Connected to bucket: ${process.env.BUCKET_NAME}`);
} else {
  console.log('[tigris] No credentials found, running without cloud backup');
}

const BUCKET = process.env.BUCKET_NAME;

// Upload a local file to Tigris (fire-and-forget, logs errors but doesn't throw)
export async function syncToTigris(localPath, tigrisKey) {
  if (!ENABLED) return;
  try {
    const content = await fs.readFile(localPath, 'utf-8');
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: tigrisKey,
      Body: content,
      ContentType: 'application/json',
    }));
    console.log(`[tigris] Synced ${tigrisKey}`);
  } catch (err) {
    console.error(`[tigris] Failed to sync ${tigrisKey}:`, err.message);
  }
}

// Download a file from Tigris to local path (returns true if restored)
async function restoreFile(tigrisKey, localPath) {
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: tigrisKey,
    }));
    const body = await response.Body.transformToString();
    // Validate it's proper JSON before writing
    JSON.parse(body);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, body);
    console.log(`[tigris] Restored ${tigrisKey} -> ${localPath}`);
    return true;
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    console.error(`[tigris] Failed to restore ${tigrisKey}:`, err.message);
    return false;
  }
}

// On startup: restore all analytics data from Tigris if local files are missing
export async function restoreFromTigris(dataDir) {
  if (!ENABLED) return;

  console.log('[tigris] Checking for cloud backups to restore...');
  let restored = 0;

  try {
    // List all objects in the bucket
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
    }));

    if (!response.Contents || response.Contents.length === 0) {
      console.log('[tigris] No backups found in cloud');
      return;
    }

    for (const obj of response.Contents) {
      const key = obj.Key;
      const localPath = path.join(dataDir, key);

      // Only restore if local file doesn't exist
      try {
        await fs.access(localPath);
        // File exists locally, skip
      } catch {
        // File missing locally, restore from Tigris
        const didRestore = await restoreFile(key, localPath);
        if (didRestore) restored++;
      }
    }

    console.log(`[tigris] Restore complete: ${restored} files recovered, ${response.Contents.length} total in cloud`);
  } catch (err) {
    console.error('[tigris] Restore failed:', err.message);
  }
}

// Helper: derive the Tigris key from a local file path relative to data dir
export function tigrisKeyFromPath(localPath, dataDir) {
  return path.relative(dataDir, localPath);
}
