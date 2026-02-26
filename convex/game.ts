import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Puzzle answers (in production, these would be environment variables)
const PUZZLE_ANSWERS: Record<number, { answer: string; hints: string[] }> = {
  0: {
    answer: "CAYMAN",
    hints: [
      "Each pair of characters represents a hexadecimal value",
      "Convert hex to decimal, then decimal to ASCII characters",
      "The routing leads to a Caribbean island known for offshore banking",
    ],
  },
  1: {
    answer: "DONATION-50000-AIRCRAFT",
    hints: [
      "Base64 uses A-Z, a-z, 0-9, +, and / characters",
      "Try an online Base64 decoder or use atob() in JavaScript",
      "The decoded text reveals a transaction type, amount, and purpose",
    ],
  },
  2: {
    answer: "PLANE",
    hints: [
      "Each group of 8 digits represents one character",
      "In binary, 01000001 = 65 = 'A' in ASCII",
      "Convert each 8-bit sequence to get a 5-letter word",
    ],
  },
};

const ENTRY_PASSCODE = "INVESTIGATE";
const FINAL_PASSCODE = "N738VN";
const TOTAL_PUZZLES = 3;

// Validate entry passcode
export const validateEntry = mutation({
  args: { passcode: v.string() },
  handler: async (_ctx, args) => {
    return args.passcode.toUpperCase().trim() === ENTRY_PASSCODE;
  },
});

// Start the game
export const startGame = mutation({
  args: {
    roomId: v.id("rooms"),
    odentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    if (room.hostId !== args.odentifier) {
      throw new Error("Only the host can start the game");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (players.length < 2) {
      throw new Error("Need at least 2 players to start");
    }

    await ctx.db.patch(args.roomId, {
      phase: "playing",
      startTime: Date.now(),
      currentPuzzle: 0,
      solvedPuzzles: [],
    });

    return { success: true };
  },
});

// Submit a puzzle answer
export const submitPuzzleAnswer = mutation({
  args: {
    roomId: v.id("rooms"),
    puzzleIndex: v.number(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    if (room.phase !== "playing") {
      throw new Error("Game is not in progress");
    }

    const puzzleData = PUZZLE_ANSWERS[args.puzzleIndex];
    if (!puzzleData) {
      throw new Error("Invalid puzzle index");
    }

    const isCorrect =
      args.answer.toUpperCase().trim() === puzzleData.answer;

    if (isCorrect) {
      const newSolvedPuzzles = room.solvedPuzzles.includes(args.puzzleIndex)
        ? room.solvedPuzzles
        : [...room.solvedPuzzles, args.puzzleIndex];

      const isLastPuzzle = newSolvedPuzzles.length === TOTAL_PUZZLES;

      if (isLastPuzzle) {
        const completionTime = Date.now() - (room.startTime || Date.now());
        await ctx.db.patch(args.roomId, {
          solvedPuzzles: newSolvedPuzzles,
          currentPuzzle: args.puzzleIndex + 1,
          phase: "victory",
          finalPasscode: FINAL_PASSCODE,
          completionTime,
        });

        return {
          correct: true,
          finalPasscode: FINAL_PASSCODE,
          completionTime,
        };
      } else {
        await ctx.db.patch(args.roomId, {
          solvedPuzzles: newSolvedPuzzles,
          currentPuzzle: args.puzzleIndex + 1,
        });

        return { correct: true };
      }
    }

    return { correct: false };
  },
});

// Get a hint
export const getHint = query({
  args: {
    puzzleIndex: v.number(),
    hintIndex: v.number(),
  },
  handler: async (_ctx, args) => {
    const puzzleData = PUZZLE_ANSWERS[args.puzzleIndex];
    if (!puzzleData) return null;

    if (args.hintIndex < 0 || args.hintIndex >= puzzleData.hints.length) {
      return null;
    }

    return puzzleData.hints[args.hintIndex];
  },
});

// Set typing status (claim input lock)
export const setTypingStatus = mutation({
  args: {
    roomId: v.id("rooms"),
    odentifier: v.string(),
    nickname: v.string(),
    puzzleIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Check if another player is currently typing (within last 3 seconds)
    const now = Date.now();
    if (
      room.typingPlayer &&
      room.typingPlayer.odentifier !== args.odentifier &&
      now - room.typingPlayer.timestamp < 3000
    ) {
      // Another player is actively typing
      return { locked: true, typingPlayer: room.typingPlayer };
    }

    // Claim the typing lock
    await ctx.db.patch(args.roomId, {
      typingPlayer: {
        odentifier: args.odentifier,
        nickname: args.nickname,
        puzzleIndex: args.puzzleIndex,
        timestamp: now,
      },
    });

    return { locked: false };
  },
});

// Clear typing status (release input lock)
export const clearTypingStatus = mutation({
  args: {
    roomId: v.id("rooms"),
    odentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Only clear if this player is the one typing
    if (room.typingPlayer?.odentifier === args.odentifier) {
      await ctx.db.patch(args.roomId, {
        typingPlayer: undefined,
      });
    }
  },
});

// Update shared input (for collaborative puzzle solving)
export const updateSharedInput = mutation({
  args: {
    roomId: v.id("rooms"),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    await ctx.db.patch(args.roomId, {
      sharedInputs: {
        ...room.sharedInputs,
        [args.key]: args.value,
      },
    });
  },
});

// Send a chat message
export const sendChatMessage = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    playerName: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      roomId: args.roomId,
      playerId: args.playerId,
      playerName: args.playerName,
      message: args.message,
      timestamp: Date.now(),
    });
  },
});

// Get chat messages for a room
export const getChatMessages = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("asc")
      .collect();
  },
});

// Delete room and all associated data (called when game completes)
export const deleteRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Delete all players
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    // Delete all chat messages
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete the room
    await ctx.db.delete(args.roomId);

    return { success: true };
  },
});
