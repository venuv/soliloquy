#!/usr/bin/env node
// Bulk verify potential Shakespeare video IDs

const SEARCHES = [
  // Common educational/documentary IDs
  'YoHnQR7RXqA', 'J3HTHaT8hog', 'VE0oIGPUz4I', 'Y8_qPbz9KLA',
  '8uMCBfqBN0k', 'qoKxfkdTbBw', 'pBuHAySzQ6Q', 'mNSxj6YhQZc',
  'x3tEkE6JvMA', 'n3FhP8Bqq-E', 'iqjUyJmfNTk', 'eU5biUyZGlE',
  // Film clips common patterns
  '5HbYScltf1c', 'l3QTJ8GNFK4', '_j8EIU-5Dvo', 'J0T2-wGlhD4',
  'kDlxhKs2Nfc', 'HoWP-p-p_8c', 'B3RKE4LdRaM', 'rR6duvZ2CFs',
  '6TEfD3m4Cdw', 'nPBPKjM7elk', 'y8Kyi0WNg40', '2TgO-tN5wAM',
  // RSC/Globe patterns
  'kpyL-3p-ePs', 'MbJBdyQFOXk', 'x2WhPGQNcLw', 'TbYMB7rREZc',
  'fK2IJ43ppd0', '9d7P8xAk1bk', 'axRaKzwX7DI', 'iPrJ3DMYWDY',
  // Classic film clips
  'v4GRQAKz4Js', 'f-_bUqq8CaI', 'MBGwNuzc1Dg', 'UVPMQbDCFnU',
  'ZQTW8AryOKg', 'qWd-k8VFmvE', 'rqqAnjY2Dqk', 'JRs-0IXVjsk',
];

async function check(id) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    if (!r.ok) return null;
    const d = await r.json();
    // Filter for Shakespeare-related
    const t = d.title.toLowerCase();
    if (t.includes('shakespeare') || t.includes('hamlet') || t.includes('macbeth') ||
        t.includes('romeo') || t.includes('juliet') || t.includes('othello') ||
        t.includes('lear') || t.includes('henry v') || t.includes('richard') ||
        t.includes('merchant') || t.includes('tempest') || t.includes('midsummer') ||
        t.includes('soliloquy') || t.includes('to be or not') || t.includes('tomorrow') ||
        t.includes('caesar') || t.includes('portia') || t.includes('prospero') ||
        t.includes('branagh') || t.includes('olivier') || t.includes('mckellen')) {
      return { id, title: d.title, author: d.author_name };
    }
    return null;
  } catch { return null; }
}

async function main() {
  console.log('Bulk checking for Shakespeare videos...\n');
  const found = [];
  for (const id of SEARCHES) {
    const r = await check(id);
    if (r) {
      console.log(`✓ ${r.id}: ${r.title}`);
      found.push(r);
    }
  }
  console.log(`\nFound ${found.length} Shakespeare-related videos`);
}

main();
