import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const ENTRY_PASSCODE = "INVESTIGATE";
const FINAL_PASSCODE = "N738VN";

// Validate entry passcode
export const validateEntry = mutation({
  args: { passcode: v.string() },
  handler: async (_ctx, args) => {
    return args.passcode.toUpperCase().trim() === ENTRY_PASSCODE;
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

    const now = Date.now();
    if (
      room.typingPlayer &&
      room.typingPlayer.odentifier !== args.odentifier &&
      now - room.typingPlayer.timestamp < 3000
    ) {
      return { locked: true, typingPlayer: room.typingPlayer };
    }

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

// Delete room and all associated data
export const deleteRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.roomId);

    return { success: true };
  },
});

// ============================================
// LOCATION-BASED SPLIT PUZZLE SYSTEM
// ============================================

// Location definitions - following the money trail theme
// Icon values are identifiers for Lucide SVG icons
const LOCATIONS: Record<string, {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  puzzles: Array<{
    title: string;
    objective: string;
    data: string[];
    answer: string;
  }>;
}> = {
  bank: {
    id: "bank",
    name: "Meridian Bank HQ",
    description: "The main branch where Viktor Volkov manages offshore transfers",
    icon: "landmark",
    puzzles: [
      {
        title: "Account Access Terminal",
        objective: "The encrypted database shows a hex-encoded account holder name. Decode the sequence to identify the primary account owner.",
        data: [
          "ACCOUNT RECORD",
          "Account Type: Private Wealth",
          "Status: ACTIVE",
          "",
          "ENCODED HOLDER:",
          "56 41 4E 43 45",
        ],
        answer: "VANCE",
      },
      {
        title: "Wire Transfer Log",
        objective: "A $50,000 wire transfer destination is encoded in Base64. Decode it to reveal the offshore banking location.",
        data: [
          "TRANSFER #7829",
          "Amount: $50,000.00",
          "Date: 2024-03-15",
          "",
          "DESTINATION CODE:",
          "Q0FZTUFOIA==",
        ],
        answer: "CAYMAN",
      },
    ],
  },
  hotel: {
    id: "hotel",
    name: "Grand Pacific Hotel",
    description: "Viktor's laptop was left in his suite - Room 1847",
    icon: "hotel",
    puzzles: [
      {
        title: "Laptop Login",
        objective: "The laptop displays a password hint encoded in binary format. Convert each 8-bit sequence to unlock access.",
        data: [
          "PASSWORD HINT",
          "",
          "01010000 01000001 01010011 01010011",
        ],
        answer: "PASS",
      },
      {
        title: "Encrypted Email",
        objective: "An unsent email draft contains a hex-encoded meeting location. Decode the coordinates to find where the next handoff occurs.",
        data: [
          "DRAFT EMAIL",
          "To: [REDACTED]",
          "Subject: Meeting Location",
          "",
          "ENCODED LOCATION:",
          "44 4F 43 4B 53",
        ],
        answer: "DOCKS",
      },
    ],
  },
  warehouse: {
    id: "warehouse",
    name: "Harbor Warehouse 7",
    description: "Shipping records suggest suspicious cargo movements here",
    icon: "warehouse",
    puzzles: [
      {
        title: "Shipping Manifest",
        objective: "A locked container manifest is Base64 encoded. Decode it to reveal what valuable cargo is being smuggled.",
        data: [
          "CONTAINER #4417",
          "Origin: UNKNOWN",
          "",
          "CONTENTS CODE:",
          "R09MRA==",
        ],
        answer: "GOLD",
      },
      {
        title: "Security Log",
        objective: "The security system logged a binary-encoded visitor ID at 2:34 AM. Convert it to identify who accessed the warehouse.",
        data: [
          "ACCESS LOG",
          "Time: 02:34 AM",
          "",
          "VISITOR ID:",
          "01001101 01000001 01010010 01001011",
        ],
        answer: "MARK",
      },
    ],
  },
  office: {
    id: "office",
    name: "Vance Foundation Office",
    description: "The charity's headquarters - where the money trail leads",
    icon: "building-2",
    puzzles: [
      {
        title: "Donation Records",
        objective: "Suspicious donation records show a hex-encoded major donor name. Decode it to uncover who's funneling money through the foundation.",
        data: [
          "DONATION #1001",
          "Amount: $100,000",
          "",
          "DONOR CODE:",
          "534D495448",
        ],
        answer: "SMITH",
      },
      {
        title: "Secret Fund",
        objective: "A hidden Excel file contains a Base64 encoded fund name. Decode it to discover what the laundered money is purchasing.",
        data: [
          "FUND DETAILS",
          "Status: HIDDEN",
          "",
          "FUND NAME:",
          "QUlSQ1JBRlQ=",
        ],
        answer: "AIRCRAFT",
      },
    ],
  },
  marina: {
    id: "marina",
    name: "Sunset Marina",
    description: "A luxury yacht registered to a shell company is docked here",
    icon: "ship",
    puzzles: [
      {
        title: "Yacht Registration",
        objective: "The vessel registration papers show a hex-encoded yacht name. Decode it to identify the suspicious vessel.",
        data: [
          "VESSEL REG",
          "Type: Motor Yacht",
          "",
          "NAME CODE:",
          "57415645",
        ],
        answer: "WAVE",
      },
      {
        title: "Captain's Log",
        objective: "The captain's digital log shows a binary-encoded destination port. Decode it to find where the yacht is headed next.",
        data: [
          "LOG ENTRY",
          "Date: Next Thursday",
          "",
          "DESTINATION:",
          "01000011 01010101 01000010 01000001",
        ],
        answer: "CUBA",
      },
    ],
  },
  airport: {
    id: "airport",
    name: "Regional Airfield",
    description: "Private planes have been making unscheduled flights",
    icon: "plane",
    puzzles: [
      {
        title: "Flight Plan",
        objective: "A suspicious flight plan has Base64 encoded cargo information. Decode it to reveal what's being transported.",
        data: [
          "FLIGHT #N738VN",
          "Type: Private Charter",
          "",
          "CARGO CODE:",
          "Q0FTSQ==",
        ],
        answer: "CASH",
      },
      {
        title: "Pilot ID",
        objective: "The pilot uses a hex-encoded callsign for radio communications. Decode it to identify the pilot's codename.",
        data: [
          "PILOT FILE",
          "License: Commercial",
          "",
          "CALLSIGN:",
          "48 41 57 4B",
        ],
        answer: "HAWK",
      },
    ],
  },
};

const LOCATION_IDS = Object.keys(LOCATIONS);

// Assign locations to players when starting game
export const startGameWithLocations = mutation({
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

    // Shuffle locations and assign to players
    const shuffledLocations = [...LOCATION_IDS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < players.length; i++) {
      const locationId = shuffledLocations[i % shuffledLocations.length];
      await ctx.db.patch(players[i]._id, {
        location: locationId,
        locationPuzzleProgress: 0,
        locationSolvedPuzzles: [],
      });
    }

    await ctx.db.patch(args.roomId, {
      phase: "playing",
      startTime: Date.now(),
      currentPuzzle: 0,
      solvedPuzzles: [],
      isLocked: true,
      useLocations: true,
    });

    return { success: true };
  },
});

// Get location puzzle data for a player
export const getLocationPuzzleData = query({
  args: {
    roomId: v.id("rooms"),
    odentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.useLocations) return null;

    const player = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("odentifier"), args.odentifier))
      .first();

    if (!player || !player.location) return null;

    const location = LOCATIONS[player.location];
    if (!location) return null;

    const puzzleIndex = player.locationPuzzleProgress || 0;
    const puzzle = location.puzzles[puzzleIndex];
    const isComplete = puzzleIndex >= location.puzzles.length;

    return {
      location: {
        id: location.id,
        name: location.name,
        description: location.description,
        icon: location.icon,
      },
      puzzle: isComplete ? null : {
        index: puzzleIndex,
        title: puzzle.title,
        objective: puzzle.objective,
        data: puzzle.data,
      },
      progress: {
        current: puzzleIndex,
        total: location.puzzles.length,
        isComplete,
        solvedPuzzles: player.locationSolvedPuzzles || [],
      },
    };
  },
});

// Submit answer for location puzzle
export const submitLocationAnswer = mutation({
  args: {
    roomId: v.id("rooms"),
    odentifier: v.string(),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.useLocations) throw new Error("Invalid room");

    const player = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("odentifier"), args.odentifier))
      .first();

    if (!player || !player.location) throw new Error("Player not found");

    const location = LOCATIONS[player.location];
    if (!location) throw new Error("Location not found");

    const puzzleIndex = player.locationPuzzleProgress || 0;
    if (puzzleIndex >= location.puzzles.length) {
      return { correct: false, message: "All puzzles completed" };
    }

    const puzzle = location.puzzles[puzzleIndex];
    const isCorrect = args.answer.toUpperCase().trim() === puzzle.answer;

    if (isCorrect) {
      const newSolvedPuzzles = [...(player.locationSolvedPuzzles || []), puzzleIndex];
      const newProgress = puzzleIndex + 1;
      const isLocationComplete = newProgress >= location.puzzles.length;

      await ctx.db.patch(player._id, {
        locationPuzzleProgress: newProgress,
        locationSolvedPuzzles: newSolvedPuzzles,
      });

      // Check if all players have completed their locations
      const allPlayers = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();

      const allComplete = allPlayers.every((p) => {
        const loc = LOCATIONS[p.location || ""];
        if (!loc) return false;
        const progress = p.locationPuzzleProgress || 0;
        return progress >= loc.puzzles.length;
      });

      if (allComplete) {
        const completionTime = Date.now() - (room.startTime || Date.now());
        await ctx.db.patch(args.roomId, {
          phase: "victory",
          finalPasscode: FINAL_PASSCODE,
          completionTime,
        });

        return {
          correct: true,
          isLocationComplete,
          isGameComplete: true,
          finalPasscode: FINAL_PASSCODE,
          completionTime,
        };
      }

      return { correct: true, isLocationComplete, isGameComplete: false };
    }

    return { correct: false };
  },
});

// Get all players' location progress (for team overview)
export const getTeamLocationProgress = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.useLocations) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return players.map((player) => {
      const location = player.location ? LOCATIONS[player.location] : null;
      const progress = player.locationPuzzleProgress || 0;
      const total = location?.puzzles.length || 0;

      return {
        odentifier: player.odentifier,
        nickname: player.nickname,
        location: location ? {
          id: location.id,
          name: location.name,
          icon: location.icon,
        } : null,
        progress: {
          current: progress,
          total,
          isComplete: progress >= total,
          percentage: total > 0 ? Math.round((progress / total) * 100) : 0,
        },
      };
    });
  },
});
