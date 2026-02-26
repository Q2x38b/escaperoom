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

// Role assignment based on player count
// 2 players: analyst + fieldAgent (fieldAgent also sees decoder info)
// 3 players: analyst + decoder + fieldAgent
// 4 players: analyst + analyst + decoder + fieldAgent
function assignRoles(playerCount: number): Array<"analyst" | "decoder" | "fieldAgent"> {
  if (playerCount === 2) {
    return ["analyst", "fieldAgent"];
  } else if (playerCount === 3) {
    return ["analyst", "decoder", "fieldAgent"];
  } else {
    // 4 players: 2 analysts, 1 decoder, 1 fieldAgent
    return ["analyst", "analyst", "decoder", "fieldAgent"];
  }
}

// Shuffle array for random role assignment
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

    // Assign roles to players
    const roles = assignRoles(players.length);
    const shuffledPlayers = shuffleArray(players);

    for (let i = 0; i < shuffledPlayers.length; i++) {
      await ctx.db.patch(shuffledPlayers[i]._id, {
        role: roles[i],
      });
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

// Role-specific puzzle data
// Each role sees different parts of the puzzle - they must communicate to solve it
const ROLE_PUZZLE_DATA: Record<number, {
  analyst: { title: string; data: string[]; description: string };
  decoder: { title: string; data: string[]; description: string };
  fieldAgent: { title: string; description: string };
}> = {
  // Puzzle 0: Hex decoding - CAYMAN
  0: {
    analyst: {
      title: "Intercepted Routing Data",
      description: "You've intercepted the destination routing codes. Share these hex values with your team.",
      data: [
        "Location Code: 43 41 59 4D 41 4E",
        "SWIFT: 4F 43 45 41 4E",
        "Reference: 56 41 4E 43 45",
      ],
    },
    decoder: {
      title: "Cryptography Reference",
      description: "You have access to the decoding manual. Help your team convert the data.",
      data: [
        "HEX TO ASCII CONVERSION:",
        "41=A  42=B  43=C  44=D  45=E",
        "46=F  47=G  48=H  49=I  4A=J",
        "4B=K  4C=L  4D=M  4E=N  4F=O",
        "50=P  51=Q  52=R  53=S  54=T",
        "55=U  56=V  57=W  58=X  59=Y  5A=Z",
      ],
    },
    fieldAgent: {
      title: "Submit Decoded Location",
      description: "Your team is decoding wire transfer data. Enter the destination location when they figure it out.",
    },
  },
  // Puzzle 1: Base64 decoding - DONATION-50000-AIRCRAFT
  1: {
    analyst: {
      title: "Flagged Transaction Data",
      description: "Transaction TXN-78291 has been flagged. Share this encoded description with your decoder.",
      data: [
        "ENCODED DESCRIPTION:",
        "RE9OQVRJT04tNTAwMDAtQUlSQ1JBRlQ=",
        "",
        "Amount: $50,000.00",
        "Type: Outbound",
        "Status: FLAGGED",
      ],
    },
    decoder: {
      title: "Base64 Decoder Tool",
      description: "Use this decoder to help your team. Convert each character using the table.",
      data: [
        "BASE64 ALPHABET:",
        "A-Z = 0-25",
        "a-z = 26-51",
        "0-9 = 52-61",
        "+ = 62, / = 63, = = padding",
        "",
        "TIP: Group into 4 chars, decode to 3 ASCII chars",
        "Online tool hint: atob() in browser console",
      ],
    },
    fieldAgent: {
      title: "Submit Transaction Description",
      description: "Your team is decoding the flagged transaction. Enter the decoded description when ready.",
    },
  },
  // Puzzle 2: Binary decoding - PLANE
  2: {
    analyst: {
      title: "Hidden File Contents",
      description: "You found a hidden file on the server. Share this binary data with your team.",
      data: [
        "FILE: secret_asset.bin",
        "LINE 01: 01010000 01001100 01000001 01001110 01000101",
        "LINE 02: 01010010 01000101 01000111 01001001 01010011 01010100 01010010 01011001",
        "LINE 03: 01001110 00110111 00110011 00111000 01010110 01001110",
      ],
    },
    decoder: {
      title: "Binary Conversion Chart",
      description: "Use this chart to help decode the binary. Each 8 bits = 1 character.",
      data: [
        "BINARY TO ASCII:",
        "01000001=A(65)  01000010=B(66)  01000011=C(67)",
        "01000100=D(68)  01000101=E(69)  01000110=F(70)",
        "01001100=L(76)  01001110=N(78)  01001111=O(79)",
        "01010000=P(80)  01010010=R(82)  01010011=S(83)",
        "",
        "Formula: Binary → Decimal → ASCII character",
      ],
    },
    fieldAgent: {
      title: "Submit Decoded Asset",
      description: "Decode LINE 01 to identify the asset. Enter the decoded word when your team figures it out.",
    },
  },
};

// Get role-specific puzzle data
export const getRolePuzzleData = query({
  args: {
    roomId: v.id("rooms"),
    odentifier: v.string(),
    puzzleIndex: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate puzzle index is in valid range
    if (args.puzzleIndex < 0 || args.puzzleIndex >= TOTAL_PUZZLES) {
      return null;
    }

    // Verify room exists
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    // Find the player to get their role
    const player = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("odentifier"), args.odentifier))
      .first();

    if (!player) return null;

    const role = player.role;
    if (!role) return null;

    const puzzleData = ROLE_PUZZLE_DATA[args.puzzleIndex];
    if (!puzzleData) return null;

    // Verify role-specific data exists
    const roleData = puzzleData[role];
    if (!roleData) return null;

    // Get the total player count to determine if fieldAgent should see decoder info too
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const playerCount = players.length;

    if (role === "analyst") {
      return {
        role: "analyst" as const,
        title: puzzleData.analyst.title,
        description: puzzleData.analyst.description,
        data: puzzleData.analyst.data,
        canSubmit: false,
      };
    } else if (role === "decoder") {
      return {
        role: "decoder" as const,
        title: puzzleData.decoder.title,
        description: puzzleData.decoder.description,
        data: puzzleData.decoder.data,
        canSubmit: false,
      };
    } else {
      // fieldAgent - can submit, and in 2-player mode also sees decoder info
      if (playerCount === 2) {
        return {
          role: "fieldAgent" as const,
          title: puzzleData.fieldAgent.title,
          description: puzzleData.fieldAgent.description,
          decoderData: puzzleData.decoder,
          canSubmit: true,
        };
      }
      return {
        role: "fieldAgent" as const,
        title: puzzleData.fieldAgent.title,
        description: puzzleData.fieldAgent.description,
        canSubmit: true,
      };
    }
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
