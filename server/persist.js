import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncToTigris, tigrisKeyFromPath } from './tigris.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

// Write JSON to local file and sync to Tigris in the background
export async function writeAndSync(filePath, data) {
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json);
  // Fire-and-forget sync to Tigris
  const key = tigrisKeyFromPath(filePath, DATA_DIR);
  syncToTigris(filePath, key);
}
