import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const AUTHORS_DIR = path.join(__dirname, '../data/authors');

// Get list of all authors
router.get('/', async (req, res) => {
  try {
    console.log('Fetching authors from:', AUTHORS_DIR);
    
    // Check if directory exists
    try {
      await fs.access(AUTHORS_DIR);
    } catch (err) {
      console.error('Authors directory does not exist:', AUTHORS_DIR);
      return res.json([]);
    }
    
    const files = await fs.readdir(AUTHORS_DIR);
    console.log('Files found:', files);
    
    const authors = [];
    
    for (const file of files) {
      // Skip macOS metadata files
      if (file.startsWith('.') || file.startsWith('._')) {
        continue;
      }
      
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(AUTHORS_DIR, file);
          console.log('Reading:', filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          const author = JSON.parse(content);
          // Get unique plays from work sources
          const uniquePlays = [...new Set((author.works || []).map(w => w.source))];
          authors.push({
            id: author.id,
            name: author.name,
            subtitle: author.subtitle,
            worksCount: author.works?.length || 0,
            playsCount: uniquePlays.length,
            portrait: author.portrait
          });
          console.log('Loaded author:', author.id);
        } catch (err) {
          console.error(`Error reading ${file}:`, err.message);
        }
      }
    }
    
    console.log('Returning authors:', authors.length);
    res.json(authors);
  } catch (err) {
    console.error('Error fetching authors:', err);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

// Get a specific author with all works
router.get('/:authorId', async (req, res) => {
  try {
    const { authorId } = req.params;
    const filePath = path.join(AUTHORS_DIR, `${authorId}.json`);
    
    console.log('Fetching author:', filePath);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const author = JSON.parse(content);
    
    res.json(author);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Author not found' });
    }
    console.error('Error fetching author:', err);
    res.status(500).json({ error: 'Failed to fetch author' });
  }
});

// Get a specific work
router.get('/:authorId/works/:workId', async (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const filePath = path.join(AUTHORS_DIR, `${authorId}.json`);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const author = JSON.parse(content);
    
    const work = author.works.find(w => w.id === workId);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    
    res.json({ ...work, author: { id: author.id, name: author.name } });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Author not found' });
    }
    console.error('Error fetching work:', err);
    res.status(500).json({ error: 'Failed to fetch work' });
  }
});

export default router;
