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
    .replace(/[''\']/g, '')  // Remove all apostrophes for comparison
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
