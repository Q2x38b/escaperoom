import type { VercelRequest, VercelResponse } from '@vercel/node';

// Answers stored in environment variables for security
const PUZZLE_ANSWERS: Record<number, { answer: string; hints: string[] }> = {
  0: {
    answer: process.env.PUZZLE_0_ANSWER || 'CAYMAN',
    hints: [
      'Each pair of characters represents a hexadecimal value',
      'Convert hex to decimal, then decimal to ASCII characters',
      'The routing leads to a Caribbean island known for offshore banking',
    ],
  },
  1: {
    answer: process.env.PUZZLE_1_ANSWER || 'DONATION-50000-AIRCRAFT',
    hints: [
      'Base64 uses A-Z, a-z, 0-9, +, and / characters',
      'Try an online Base64 decoder or use atob() in JavaScript',
      'The decoded text reveals a transaction type, amount, and purpose',
    ],
  },
  2: {
    answer: process.env.PUZZLE_2_ANSWER || 'PLANE',
    hints: [
      'Each group of 8 digits represents one character',
      'In binary, 01000001 = 65 = "A" in ASCII',
      'Convert each 8-bit sequence to get a 5-letter word',
    ],
  },
};

const ENTRY_PASSCODE = process.env.ENTRY_PASSCODE || 'INVESTIGATE';
const FINAL_PASSCODE = process.env.FINAL_PASSCODE || 'N738JL';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, puzzleIndex, answer, hintIndex } = req.body;

  if (type === 'entry') {
    const isCorrect = answer?.toUpperCase().trim() === ENTRY_PASSCODE;
    return res.status(200).json({ correct: isCorrect });
  }

  if (type === 'puzzle') {
    const puzzle = PUZZLE_ANSWERS[puzzleIndex];
    if (!puzzle) {
      return res.status(400).json({ error: 'Invalid puzzle index' });
    }

    const isCorrect = answer?.toUpperCase().trim() === puzzle.answer;

    if (isCorrect && puzzleIndex === 2) {
      // Last puzzle - return the final passcode
      return res.status(200).json({
        correct: true,
        finalPasscode: FINAL_PASSCODE
      });
    }

    return res.status(200).json({ correct: isCorrect });
  }

  if (type === 'hint') {
    const puzzle = PUZZLE_ANSWERS[puzzleIndex];
    if (!puzzle) {
      return res.status(400).json({ error: 'Invalid puzzle index' });
    }

    const hint = puzzle.hints[hintIndex];
    if (!hint) {
      return res.status(400).json({ error: 'Invalid hint index' });
    }

    return res.status(200).json({ hint });
  }

  return res.status(400).json({ error: 'Invalid request type' });
}
