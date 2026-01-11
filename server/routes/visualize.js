import express from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper: Get first letter of each word
const getFirstLetters = (text) => {
  return text
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => {
      // Get first alphabetic character
      const match = word.match(/[a-zA-Z]/);
      return match ? match[0].toUpperCase() : '';
    })
    .filter(letter => letter)
    .join('');
};

// Helper: Count words in text
const countWords = (text) => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Helper: Get full text from chunks
const getFullText = (chunks) => {
  return chunks.map(c => `${c.front} ${c.back}`).join(' ');
};

// Analyze text for a work
router.get('/analyze/:authorId/:workId', (req, res) => {
  try {
    const { authorId, workId } = req.params;
    const dataPath = path.join(__dirname, '../data/authors', `${authorId}.json`);
    const author = JSON.parse(readFileSync(dataPath, 'utf-8'));
    const work = author.works.find(w => w.id === workId);

    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    const fullText = getFullText(work.chunks);

    // Analysis for entire soliloquy
    const soliloquyAnalysis = {
      firstLetters: getFirstLetters(fullText),
      wordCount: countWords(fullText),
      chunkCount: work.chunks.length
    };

    // Analysis per chunk
    const chunkAnalysis = work.chunks.map((chunk, index) => {
      const chunkText = `${chunk.front} ${chunk.back}`;
      return {
        index,
        front: chunk.front,
        back: chunk.back,
        firstLetters: getFirstLetters(chunkText),
        wordCount: countWords(chunkText)
      };
    });

    res.json({
      work: {
        id: work.id,
        title: work.title,
        source: work.source,
        character: work.character,
        act: work.act
      },
      soliloquy: soliloquyAnalysis,
      chunks: chunkAnalysis,
      fullText
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Generate images using Replicate Flux Schnell
router.post('/generate-images', async (req, res) => {
  try {
    const { prompt, workTitle, character } = req.body;
    const apiToken = process.env.REPLICATE_API_TOKEN;

    if (!apiToken) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
    }

    // Build an evocative prompt for the soliloquy
    const imagePrompt = prompt ||
      `Dramatic theatrical scene from Shakespeare, ${character} performing "${workTitle}", dramatic lighting, Renaissance theater, oil painting style, classical art, moody atmosphere`;

    // Generate 2 images using Flux Schnell
    const predictions = [];

    for (let i = 0; i < 2; i++) {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-schnell',
          input: {
            prompt: imagePrompt,
            num_outputs: 1,
            aspect_ratio: '1:1',
            output_format: 'webp',
            output_quality: 80,
            go_fast: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Replicate API error:', errorText);
        throw new Error(`Replicate API error: ${response.status}`);
      }

      const prediction = await response.json();
      predictions.push(prediction);
    }

    // Poll for results
    const results = await Promise.all(predictions.map(async (pred) => {
      let result = pred;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max wait

      while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          }
        });

        result = await pollResponse.json();
        attempts++;
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Image generation failed');
      }

      return {
        id: result.id,
        url: result.output?.[0] || result.output,
        status: result.status
      };
    }));

    res.json({
      success: true,
      images: results,
      prompt: imagePrompt
    });

  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ error: err.message || 'Image generation failed' });
  }
});

// Simple image generation endpoint (one request, returns 2 images)
router.post('/generate', async (req, res) => {
  try {
    const { prompt, workTitle, character, source } = req.body;
    const apiToken = process.env.REPLICATE_API_TOKEN;

    if (!apiToken) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
    }

    // Build evocative prompts for variety
    const baseTheme = `Dramatic theatrical scene, ${character || 'a figure'} in "${workTitle || 'Shakespeare play'}"`;
    const prompts = [
      `${baseTheme}, Renaissance oil painting, dramatic chiaroscuro lighting, moody atmosphere, classical art masterpiece`,
      `${baseTheme}, ethereal dreamlike quality, misty stage, theatrical spotlight, Baroque style, rich colors`
    ];

    // Generate 2 images in parallel
    const imageRequests = prompts.map(async (imgPrompt) => {
      const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait'  // Wait for result
        },
        body: JSON.stringify({
          input: {
            prompt: imgPrompt,
            num_outputs: 1,
            aspect_ratio: '1:1',
            output_format: 'webp',
            output_quality: 80,
            go_fast: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Replicate error:', errorText);
        throw new Error(`Replicate error: ${response.status}`);
      }

      const result = await response.json();
      return {
        url: result.output?.[0] || result.output,
        prompt: imgPrompt
      };
    });

    const images = await Promise.all(imageRequests);

    res.json({
      success: true,
      images
    });

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

export default router;
