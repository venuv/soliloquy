/**
 * Memory Card Utility Functions
 *
 * Core utility functions for the flashcard memorization system.
 * Handles text normalization, similarity scoring, and answer validation.
 */

/**
 * Normalizes text for comparison by:
 * - Converting to lowercase
 * - Removing apostrophes (all variants)
 * - Normalizing dashes
 * - Removing non-word characters (except spaces and dashes)
 * - Collapsing multiple spaces
 *
 * @param {string} text - The text to normalize
 * @returns {string} The normalized text
 */
export const normalizeText = (text) => {
  return text.toLowerCase()
    .replace(/[''']d\b/g, 'ed')   // Archaic: lin'd → lined, remember'd → remembered
    .replace(/[''']st\b/g, 'est') // Archaic: know'st → knowest
    .replace(/[''\']/g, '')  // Remove remaining apostrophes
    .replace(/[—–-]/g, '-')  // Normalize all dash types
    .replace(/[^\w\s-]/g, '') // Remove punctuation except dashes
    .replace(/\s+/g, ' ')    // Collapse multiple spaces
    .trim()
}

/**
 * Calculates a similarity score between two strings based on word matching.
 * Uses a flexible matching that checks if words contain each other.
 *
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} Similarity score between 0 and 1
 */
export const similarityScore = (str1, str2) => {
  const s1 = normalizeText(str1)
  const s2 = normalizeText(str2)
  const words1 = s1.split(' ')
  const words2 = s2.split(' ').slice() // copy for consumption
  let matches = 0
  words1.forEach(w1 => {
    const idx = words2.indexOf(w1)
    if (idx !== -1) {
      matches++
      words2.splice(idx, 1) // consume so duplicates aren't double-counted
    }
  })
  return matches / Math.max(words1.length, words2.length)
}

/**
 * Checks if the user's answer contains the expected text.
 * Useful when user typed more than needed but includes the correct answer.
 *
 * @param {string} userAnswer - The user's answer
 * @param {string} expected - The expected answer
 * @returns {boolean} True if the user answer contains or starts with expected
 */
export const containsExpected = (userAnswer, expected) => {
  const normUser = normalizeText(userAnswer)
  const normExpected = normalizeText(expected)
  return normUser.includes(normExpected) || normUser.startsWith(normExpected)
}

/**
 * Longest Common Subsequence length between two word arrays.
 * Measures how well the user preserved word order.
 */
const lcsLength = (a, b) => {
  const m = a.length, n = b.length
  // Use 1D DP for memory efficiency
  const prev = new Array(n + 1).fill(0)
  const curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1] + 1
        : Math.max(prev[j], curr[j - 1])
    }
    for (let j = 0; j <= n; j++) { prev[j] = curr[j]; curr[j] = 0 }
  }
  return prev[n]
}

/**
 * N-gram overlap ratio between two word arrays.
 * Captures exact phrasing fidelity.
 */
const ngramOverlap = (userWords, expectedWords, n) => {
  if (expectedWords.length < n) return userWords.length >= expectedWords.length ? 1 : 0
  const makeNgrams = (words) => {
    const grams = new Map()
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(' ')
      grams.set(gram, (grams.get(gram) || 0) + 1)
    }
    return grams
  }
  const expected = makeNgrams(expectedWords)
  const user = makeNgrams(userWords)
  let matches = 0
  for (const [gram, count] of expected) {
    matches += Math.min(count, user.get(gram) || 0)
  }
  return matches / expected.size
}

/**
 * Composite scoring across 4 dimensions:
 * - Word Recall: what fraction of expected words appear (order-independent)
 * - Sequence: longest common subsequence preserving word order
 * - Phrasing: bigram + trigram overlap for exact phrase fidelity
 * - Completeness: how much of the expected text was covered
 *
 * @param {string} userText - The user's answer
 * @param {string} expectedText - The expected answer
 * @param {Array} [chunks] - Optional chunks array for line-level analysis
 * @returns {object} { composite, wordRecall, sequence, phrasing, completeness, lineResults }
 */
export const compositeScore = (userText, expectedText, chunks) => {
  const normUser = normalizeText(userText)
  const normExpected = normalizeText(expectedText)
  const userWords = normUser.split(' ').filter(Boolean)
  const expectedWords = normExpected.split(' ').filter(Boolean)

  if (expectedWords.length === 0) {
    return { composite: userWords.length === 0 ? 1 : 0, wordRecall: 0, sequence: 0, phrasing: 0, completeness: 0, lineResults: [] }
  }

  // 1. Word Recall — matched words / expected words (order-independent)
  const expectedPool = expectedWords.slice()
  let wordMatches = 0
  userWords.forEach(w => {
    const idx = expectedPool.indexOf(w)
    if (idx !== -1) { wordMatches++; expectedPool.splice(idx, 1) }
  })
  const wordRecall = wordMatches / expectedWords.length

  // 2. Sequence — LCS / expected length
  const sequence = lcsLength(userWords, expectedWords) / expectedWords.length

  // 3. Phrasing — average of bigram and trigram overlap
  const bigramScore = ngramOverlap(userWords, expectedWords, 2)
  const trigramScore = ngramOverlap(userWords, expectedWords, 3)
  const phrasing = (bigramScore + trigramScore) / 2

  // 4. Completeness — line-level coverage
  let completeness = wordRecall // fallback
  let lineResults = []
  if (chunks && chunks.length > 0) {
    lineResults = chunks.map(chunk => {
      const lineText = normalizeText(`${chunk.front} ${chunk.back}`)
      const lineWords = lineText.split(' ').filter(Boolean)
      const pool = userWords.slice()
      let hits = 0
      lineWords.forEach(w => {
        const idx = pool.indexOf(w)
        if (idx !== -1) { hits++; pool.splice(idx, 1) }
      })
      const lineScore = hits / lineWords.length
      return {
        front: chunk.front,
        back: chunk.back,
        score: lineScore,
        status: lineScore >= 0.9 ? 'perfect' : lineScore >= 0.5 ? 'partial' : 'missing'
      }
    })
    const covered = lineResults.filter(l => l.score >= 0.5).length
    completeness = covered / lineResults.length
  }

  // Composite: weighted blend
  const composite = 0.30 * sequence + 0.25 * phrasing + 0.25 * wordRecall + 0.20 * completeness

  return { composite, wordRecall, sequence, phrasing, completeness, lineResults }
}

/**
 * Word-level diff between user answer and expected answer.
 * Returns array of { word, status } where status is 'correct', 'missing', or 'extra'.
 *
 * Uses LCS to align words, then marks unmatched expected words as missing
 * and unmatched user words as extra.
 */
export const wordDiff = (userText, expectedText) => {
  const normUser = normalizeText(userText)
  const normExpected = normalizeText(expectedText)
  const userWords = normUser.split(' ').filter(Boolean)
  const expectedWords = normExpected.split(' ').filter(Boolean)

  // Build full LCS table for backtracking
  const m = userWords.length, n = expectedWords.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = userWords[i - 1] === expectedWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  // Backtrack to find alignment
  const result = []
  let i = m, j = n
  const aligned = [] // collect in reverse
  while (i > 0 && j > 0) {
    if (userWords[i - 1] === expectedWords[j - 1]) {
      aligned.push({ userIdx: i - 1, expIdx: j - 1 })
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  aligned.reverse()

  // Build expected-side diff: mark each expected word as correct or missing
  const matchedExpIdx = new Set(aligned.map(a => a.expIdx))
  const expectedDiff = expectedWords.map((word, idx) => ({
    word,
    status: matchedExpIdx.has(idx) ? 'correct' : 'missing'
  }))

  // Build user-side diff: mark extra words
  const matchedUserIdx = new Set(aligned.map(a => a.userIdx))
  const userDiff = userWords.map((word, idx) => ({
    word,
    status: matchedUserIdx.has(idx) ? 'correct' : 'extra'
  }))

  return { expectedDiff, userDiff }
}

/**
 * Counts the number of words in a text.
 *
 * @param {string} text - The text to count words in
 * @returns {number} The word count
 */
export const wordCount = (text) => text.trim().split(/\s+/).length

/**
 * Validates an answer against the expected answer using multiple strategies:
 * 1. Similarity score (>= threshold)
 * 2. Contains expected text
 *
 * @param {string} userAnswer - The user's answer
 * @param {string} expectedAnswer - The expected answer
 * @param {number} threshold - Minimum similarity threshold (default 0.5)
 * @returns {object} { isCorrect: boolean, similarity: number, containsExpected: boolean }
 */
export const validateAnswer = (userAnswer, expectedAnswer, threshold = 0.5) => {
  const similarity = similarityScore(userAnswer, expectedAnswer)
  const hasExpected = containsExpected(userAnswer, expectedAnswer)
  return {
    isCorrect: similarity >= threshold || hasExpected,
    similarity,
    containsExpected: hasExpected
  }
}

/**
 * Generates a randomized test order for flashcard indices.
 *
 * @param {number} length - Number of flashcards
 * @returns {number[]} Shuffled array of indices
 */
export const generateTestOrder = (length) => {
  return [...Array(length).keys()].sort(() => Math.random() - 0.5)
}

/**
 * Calculates the percentage score from correct/total.
 *
 * @param {number} correct - Number of correct answers
 * @param {number} total - Total number of questions
 * @returns {number} Percentage (0-100)
 */
export const calculatePercentage = (correct, total) => {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

/**
 * Concatenates all chunk text within a beat into a single string.
 *
 * @param {Array} chunks - The work's chunks array
 * @param {object} beat - Beat object with startChunk and endChunk (inclusive)
 * @returns {string} The full text of all lines in the beat
 */
export const getBeatText = (chunks, beat) => {
  return chunks.slice(beat.startChunk, beat.endChunk + 1)
    .map(c => `${c.front} ${c.back}`)
    .join(' ')
}

/**
 * Returns a display prompt for a beat.
 *
 * @param {object} beat - Beat object with label and intention
 * @returns {string} Formatted prompt string
 */
export const getBeatPrompt = (beat) => {
  return `${beat.label}: ${beat.intention}`
}

/**
 * Returns the first few words of a beat's opening line as a text cue.
 *
 * @param {Array} chunks - The work's chunks array
 * @param {object} beat - Beat object with startChunk
 * @param {number} [wordLimit=5] - Max words to include
 * @returns {string} Opening words followed by "..."
 */
export const getBeatCue = (chunks, beat, wordLimit = 5) => {
  const firstChunk = chunks[beat.startChunk]
  const fullLine = `${firstChunk.front} ${firstChunk.back}`
  const words = fullLine.split(/\s+/)
  if (words.length <= wordLimit) return fullLine
  return words.slice(0, wordLimit).join(' ') + '...'
}
