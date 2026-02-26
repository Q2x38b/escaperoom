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
    createdAt: v.number(),
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
  })
    .index("by_room", ["roomId"])
    .index("by_identifier", ["odentifier"]),

  chatMessages: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    playerName: v.string(),
    message: v.string(),
    timestamp: v.number(),
  }).index("by_room", ["roomId"]),
});
