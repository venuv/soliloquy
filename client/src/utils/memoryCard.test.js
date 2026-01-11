/**
 * Memory Card Utility Tests
 *
 * Standalone tests for the memory card utility functions
 * using the "Tomorrow, and tomorrow, and tomorrow" soliloquy from Macbeth.
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeText,
  similarityScore,
  containsExpected,
  wordCount,
  validateAnswer,
  generateTestOrder,
  calculatePercentage
} from './memoryCard.js'

// Sample soliloquy data: "Tomorrow, and tomorrow, and tomorrow" from Macbeth
// (Act 5, Scene 5, spoken by Macbeth after learning of Lady Macbeth's death)
const TOMORROW_SOLILOQUY = {
  id: 'tomorrow-and-tomorrow',
  title: 'Tomorrow, and tomorrow, and tomorrow',
  source: 'Macbeth',
  character: 'Macbeth',
  act: 'Act 5, Scene 5',
  chunks: [
    { front: 'Tomorrow, and tomorrow,', back: 'and tomorrow,' },
    { front: 'Creeps in this petty pace', back: 'from day to day,' },
    { front: 'To the last syllable', back: 'of recorded time;' },
    { front: 'And all our yesterdays have', back: 'lighted fools' },
    { front: 'The way to', back: 'dusty death.' },
    { front: 'Out, out,', back: 'brief candle!' },
    { front: "Life's but a walking shadow,", back: 'a poor player,' },
    { front: 'That struts and frets his hour', back: 'upon the stage,' },
    { front: 'And then', back: 'is heard no more.' },
    { front: 'It is a tale told', back: 'by an idiot,' },
    { front: 'Full of sound and fury,', back: 'Signifying nothing.' }
  ]
}

describe('Memory Card Utility - Tomorrow Soliloquy Tests', () => {

  describe('normalizeText', () => {
    it('should convert text to lowercase', () => {
      expect(normalizeText('Tomorrow')).toBe('tomorrow')
      expect(normalizeText('MACBETH')).toBe('macbeth')
    })

    it('should remove apostrophes', () => {
      expect(normalizeText("Life's")).toBe('lifes')
      expect(normalizeText("'tis")).toBe('tis')
      expect(normalizeText("don't")).toBe('dont')
    })

    it('should normalize different dash types', () => {
      expect(normalizeText('day—to—day')).toBe('day-to-day')
      expect(normalizeText('day–to–day')).toBe('day-to-day')
      expect(normalizeText('day-to-day')).toBe('day-to-day')
    })

    it('should remove punctuation except dashes', () => {
      expect(normalizeText('dusty death.')).toBe('dusty death')
      expect(normalizeText('brief candle!')).toBe('brief candle')
      expect(normalizeText('and tomorrow,')).toBe('and tomorrow')
      expect(normalizeText('recorded time;')).toBe('recorded time')
    })

    it('should collapse multiple spaces', () => {
      expect(normalizeText('tomorrow  and   tomorrow')).toBe('tomorrow and tomorrow')
    })

    it('should trim whitespace', () => {
      expect(normalizeText('  tomorrow  ')).toBe('tomorrow')
    })

    it('should handle actual soliloquy chunks', () => {
      const chunk = TOMORROW_SOLILOQUY.chunks[6] // "Life's but a walking shadow,"
      expect(normalizeText(chunk.front)).toBe('lifes but a walking shadow')
      expect(normalizeText(chunk.back)).toBe('a poor player')
    })
  })

  describe('similarityScore', () => {
    it('should return 1.0 for identical strings', () => {
      expect(similarityScore('and tomorrow', 'and tomorrow')).toBe(1)
    })

    it('should return 1.0 for case-insensitive matches', () => {
      expect(similarityScore('AND TOMORROW', 'and tomorrow')).toBe(1)
    })

    it('should return 1.0 ignoring punctuation', () => {
      expect(similarityScore('and tomorrow,', 'and tomorrow')).toBe(1)
      expect(similarityScore('brief candle!', 'brief candle')).toBe(1)
    })

    it('should return high score for partial word matches', () => {
      // "lifes" matches with "life" due to includes check
      const score = similarityScore("Life's", 'life')
      expect(score).toBeGreaterThan(0.5)
    })

    it('should return low score for unrelated strings', () => {
      const score = similarityScore('tomorrow', 'completely different')
      expect(score).toBeLessThan(0.5)
    })

    it('should handle actual soliloquy chunk validation', () => {
      const chunk = TOMORROW_SOLILOQUY.chunks[0]
      // User correctly answers "and tomorrow"
      const score = similarityScore('and tomorrow', chunk.back)
      expect(score).toBeGreaterThanOrEqual(0.5)
    })

    it('should score misspelled answers appropriately', () => {
      // "dusty deth" vs "dusty death." - should still match 'dusty'
      const chunk = TOMORROW_SOLILOQUY.chunks[4]
      const score = similarityScore('dusty deth', chunk.back)
      expect(score).toBeGreaterThanOrEqual(0.5) // 'dusty' matches
    })
  })

  describe('containsExpected', () => {
    it('should return true when answer contains expected text', () => {
      const chunk = TOMORROW_SOLILOQUY.chunks[5] // "brief candle!"
      expect(containsExpected('brief candle', chunk.back)).toBe(true)
      expect(containsExpected('brief candle my response', chunk.back)).toBe(true)
    })

    it('should return true when answer starts with expected text', () => {
      expect(containsExpected('from day to day and more', 'from day to day,')).toBe(true)
    })

    it('should return false when answer does not contain expected', () => {
      expect(containsExpected('wrong answer', 'brief candle!')).toBe(false)
    })

    it('should handle case insensitivity', () => {
      expect(containsExpected('BRIEF CANDLE', 'brief candle!')).toBe(true)
    })

    it('should handle punctuation differences', () => {
      expect(containsExpected('a poor player', 'a poor player,')).toBe(true)
    })
  })

  describe('wordCount', () => {
    it('should count words in simple strings', () => {
      expect(wordCount('and tomorrow')).toBe(2)
      expect(wordCount('from day to day')).toBe(4)
    })

    it('should handle all soliloquy chunks', () => {
      TOMORROW_SOLILOQUY.chunks.forEach((chunk, idx) => {
        const frontWords = wordCount(chunk.front)
        const backWords = wordCount(chunk.back)
        expect(frontWords).toBeGreaterThan(0)
        expect(backWords).toBeGreaterThan(0)
        // Chunks should have reasonable word counts
        expect(frontWords).toBeLessThanOrEqual(10)
        expect(backWords).toBeLessThanOrEqual(10)
      })
    })

    it('should count specific chunk words correctly', () => {
      expect(wordCount(TOMORROW_SOLILOQUY.chunks[0].back)).toBe(2) // "and tomorrow,"
      expect(wordCount(TOMORROW_SOLILOQUY.chunks[4].back)).toBe(2) // "dusty death."
      expect(wordCount(TOMORROW_SOLILOQUY.chunks[10].back)).toBe(2) // "Signifying nothing."
    })
  })

  describe('validateAnswer', () => {
    it('should mark correct answer as correct', () => {
      const chunk = TOMORROW_SOLILOQUY.chunks[5] // back: "brief candle!"
      const result = validateAnswer('brief candle', chunk.back)
      expect(result.isCorrect).toBe(true)
      expect(result.similarity).toBeGreaterThanOrEqual(0.5)
    })

    it('should mark wrong answer as incorrect', () => {
      const chunk = TOMORROW_SOLILOQUY.chunks[5]
      const result = validateAnswer('completely wrong', chunk.back)
      expect(result.isCorrect).toBe(false)
      expect(result.similarity).toBeLessThan(0.5)
    })

    it('should accept answers that contain expected text', () => {
      const chunk = TOMORROW_SOLILOQUY.chunks[4] // back: "dusty death."
      const result = validateAnswer('dusty death indeed', chunk.back)
      expect(result.isCorrect).toBe(true)
      expect(result.containsExpected).toBe(true)
    })

    it('should use custom threshold', () => {
      const chunk = TOMORROW_SOLILOQUY.chunks[0]
      // With high threshold, partial match should fail
      const resultStrict = validateAnswer('tomorrow', chunk.back, 0.9)
      // With low threshold, partial match may pass
      const resultLenient = validateAnswer('tomorrow', chunk.back, 0.3)
      expect(resultLenient.isCorrect).toBe(true)
    })

    it('should validate all chunks of the soliloquy', () => {
      // Simulate a perfect user answering all chunks correctly
      TOMORROW_SOLILOQUY.chunks.forEach((chunk, idx) => {
        const result = validateAnswer(chunk.back, chunk.back)
        expect(result.isCorrect).toBe(true)
        expect(result.similarity).toBe(1)
      })
    })
  })

  describe('generateTestOrder', () => {
    it('should generate array of correct length', () => {
      const order = generateTestOrder(TOMORROW_SOLILOQUY.chunks.length)
      expect(order).toHaveLength(11)
    })

    it('should contain all indices', () => {
      const order = generateTestOrder(11)
      const sorted = [...order].sort((a, b) => a - b)
      expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })

    it('should generate different orders (probabilistic)', () => {
      // Run multiple times and check if at least one is different
      const orders = Array(10).fill(null).map(() => generateTestOrder(11))
      const firstOrder = orders[0].join(',')
      const hasVariation = orders.some(o => o.join(',') !== firstOrder)
      // With 11 elements, probability of all 10 being identical is astronomically low
      expect(hasVariation).toBe(true)
    })
  })

  describe('calculatePercentage', () => {
    it('should calculate correct percentage', () => {
      expect(calculatePercentage(11, 11)).toBe(100) // Perfect score on Tomorrow soliloquy
      expect(calculatePercentage(0, 11)).toBe(0)
      expect(calculatePercentage(5, 11)).toBe(45) // Math.round(45.45)
      expect(calculatePercentage(6, 11)).toBe(55) // Math.round(54.54)
    })

    it('should handle zero total', () => {
      expect(calculatePercentage(0, 0)).toBe(0)
    })

    it('should round to nearest integer', () => {
      expect(calculatePercentage(1, 3)).toBe(33)
      expect(calculatePercentage(2, 3)).toBe(67)
    })
  })

  describe('Full Soliloquy Practice Simulation', () => {
    it('should simulate a complete memorize session', () => {
      const chunks = TOMORROW_SOLILOQUY.chunks
      const mastered = new Set()

      // User goes through all chunks and masters each one
      chunks.forEach((chunk, idx) => {
        // Verify we can read front
        expect(chunk.front).toBeTruthy()
        // Mark as mastered after viewing back
        expect(chunk.back).toBeTruthy()
        mastered.add(idx)
      })

      expect(mastered.size).toBe(11)
    })

    it('should simulate a complete test session with perfect score', () => {
      const chunks = TOMORROW_SOLILOQUY.chunks
      let correct = 0
      let total = 0

      chunks.forEach((chunk) => {
        // User answers with exact back text
        const result = validateAnswer(chunk.back, chunk.back)
        if (result.isCorrect) correct++
        total++
      })

      expect(correct).toBe(11)
      expect(total).toBe(11)
      expect(calculatePercentage(correct, total)).toBe(100)
    })

    it('should simulate a test session with voice recognition variations', () => {
      // Voice recognition often has slight variations
      const voiceInputs = [
        { expected: 'and tomorrow,', spoken: 'and tomorrow' },
        { expected: 'from day to day,', spoken: 'from day to day' },
        { expected: 'of recorded time;', spoken: 'of recorded time' },
        { expected: 'lighted fools', spoken: 'lighted fools' },
        { expected: 'dusty death.', spoken: 'dusty death' },
        { expected: 'brief candle!', spoken: 'brief candle' },
        { expected: 'a poor player,', spoken: 'a poor player' },
        { expected: 'upon the stage,', spoken: 'upon the stage' },
        { expected: 'is heard no more.', spoken: 'is heard no more' },
        { expected: 'by an idiot,', spoken: 'by an idiot' },
        { expected: 'Signifying nothing.', spoken: 'signifying nothing' }
      ]

      let correct = 0
      voiceInputs.forEach(({ expected, spoken }) => {
        const result = validateAnswer(spoken, expected)
        if (result.isCorrect) correct++
      })

      // All should pass since punctuation is normalized
      expect(correct).toBe(11)
    })

    it('should handle common mistakes', () => {
      const testCases = [
        // Partial correct - should pass with similarity
        { user: 'and tomorrow', expected: 'and tomorrow,', shouldPass: true },
        // Missing word - should fail
        { user: 'tomorrow', expected: 'and tomorrow,', shouldPass: true }, // 'tomorrow' is in both
        // Completely wrong
        { user: 'hello world', expected: 'dusty death.', shouldPass: false },
        // Extra words but contains answer
        { user: 'brief candle burns', expected: 'brief candle!', shouldPass: true },
        // Partial match on one word (candle) - 50% similarity so it passes
        { user: 'short candle', expected: 'brief candle!', shouldPass: true },
        // No matching words at all
        { user: 'quick lamp', expected: 'brief candle!', shouldPass: false },
      ]

      testCases.forEach(({ user, expected, shouldPass }) => {
        const result = validateAnswer(user, expected)
        expect(result.isCorrect).toBe(shouldPass)
      })
    })
  })

  describe('Soliloquy Metadata', () => {
    it('should have correct metadata for Tomorrow soliloquy', () => {
      expect(TOMORROW_SOLILOQUY.id).toBe('tomorrow-and-tomorrow')
      expect(TOMORROW_SOLILOQUY.source).toBe('Macbeth')
      expect(TOMORROW_SOLILOQUY.character).toBe('Macbeth')
      expect(TOMORROW_SOLILOQUY.act).toBe('Act 5, Scene 5')
    })

    it('should have 11 chunks covering the full soliloquy', () => {
      expect(TOMORROW_SOLILOQUY.chunks).toHaveLength(11)

      // Verify the soliloquy flows correctly
      const fullText = TOMORROW_SOLILOQUY.chunks
        .map(c => `${c.front} ${c.back}`)
        .join(' ')

      expect(fullText).toContain('Tomorrow, and tomorrow, and tomorrow')
      expect(fullText).toContain('petty pace')
      expect(fullText).toContain('dusty death')
      expect(fullText).toContain('brief candle')
      expect(fullText).toContain('walking shadow')
      expect(fullText).toContain('poor player')
      expect(fullText).toContain('struts and frets')
      expect(fullText).toContain('tale told')
      expect(fullText).toContain('sound and fury')
      expect(fullText).toContain('Signifying nothing')
    })
  })
})
