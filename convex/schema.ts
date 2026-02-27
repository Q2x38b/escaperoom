import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostId: v.string(),
    phase: v.union(
      v.literal("waiting"),
      v.literal("playing"),
      v.literal("victory")
    ),
    currentPuzzle: v.number(),
    solvedPuzzles: v.array(v.number()),
    startTime: v.optional(v.number()),
    finalPasscode: v.optional(v.string()),
    completionTime: v.optional(v.number()),
    sharedInputs: v.record(v.string(), v.string()),
    typingPlayer: v.optional(v.object({
      odentifier: v.string(),
      nickname: v.string(),
      puzzleIndex: v.number(),
      timestamp: v.number(),
    })),
    // Chat typing indicator - who is currently typing in chat
    chatTypingPlayer: v.optional(v.object({
      odentifier: v.string(),
      nickname: v.string(),
      timestamp: v.number(),
    })),
    isLocked: v.optional(v.boolean()),
    createdAt: v.number(),
    // Split locations mode - each player has their own location and puzzles
    useLocations: v.optional(v.boolean()),
  })
    .index("by_code", ["code"])
    .index("by_createdAt", ["createdAt"]),

  players: defineTable({
    roomId: v.id("rooms"),
    odentifier: v.string(),
    nickname: v.string(),
    isHost: v.boolean(),
    isReady: v.boolean(),
    joinedAt: v.number(),
    lastSeen: v.number(),
    // Location assignment for split mode
    location: v.optional(v.string()),
    // Individual puzzle progress for location mode (0-2 puzzles per location)
    locationPuzzleProgress: v.optional(v.number()),
    // Solved puzzles at this location
    locationSolvedPuzzles: v.optional(v.array(v.number())),
  })
    .index("by_room", ["roomId"])
    .index("by_identifier", ["odentifier"])
    .index("by_lastSeen", ["lastSeen"]),

  chatMessages: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    playerName: v.string(),
    message: v.string(),
    timestamp: v.number(),
  }).index("by_room", ["roomId"]),
});
