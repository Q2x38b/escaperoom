import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a random 8-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new room
export const createRoom = mutation({
  args: {
    nickname: v.string(),
    odentifier: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a unique room code
    let code = generateRoomCode();
    let existingRoom = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    // Ensure code is unique
    while (existingRoom) {
      code = generateRoomCode();
      existingRoom = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    // Create the room
    const roomId = await ctx.db.insert("rooms", {
      code,
      hostId: args.odentifier,
      phase: "waiting",
      currentPuzzle: 0,
      solvedPuzzles: [],
      sharedInputs: {},
      createdAt: Date.now(),
    });

    // Add the host as a player
    await ctx.db.insert("players", {
      roomId,
      odentifier: args.odentifier,
      nickname: args.nickname,
      isHost: true,
      isReady: true,
      joinedAt: Date.now(),
    });

    return { roomId, code };
  },
});

// Join an existing room
export const joinRoom = mutation({
  args: {
    code: v.string(),
    nickname: v.string(),
    odentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.phase !== "waiting") {
      throw new Error("Game has already started");
    }

    // Check if player already in room
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .filter((q) => q.eq(q.field("odentifier"), args.odentifier))
      .first();

    if (existingPlayer) {
      // Update nickname if rejoining
      await ctx.db.patch(existingPlayer._id, { nickname: args.nickname });
      return { roomId: room._id, code: room.code };
    }

    // Check player count (max 4)
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    if (players.length >= 4) {
      throw new Error("Room is full");
    }

    // Add player
    await ctx.db.insert("players", {
      roomId: room._id,
      odentifier: args.odentifier,
      nickname: args.nickname,
      isHost: false,
      isReady: true,
      joinedAt: Date.now(),
    });

    return { roomId: room._id, code: room.code };
  },
});

// Leave a room
export const leaveRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    odentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("odentifier"), args.odentifier))
      .first();

    if (player) {
      await ctx.db.delete(player._id);
    }

    // Check if room is empty, delete if so
    const remainingPlayers = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (remainingPlayers.length === 0) {
      // Delete chat messages
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .collect();

      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // Delete room
      await ctx.db.delete(args.roomId);
    } else if (player?.isHost) {
      // Transfer host to next player
      const newHost = remainingPlayers[0];
      await ctx.db.patch(newHost._id, { isHost: true });
      await ctx.db.patch(args.roomId, { hostId: newHost.odentifier });
    }
  },
});

// Get room by code
export const getRoomByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();
  },
});

// Get room by ID with players
export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return { ...room, players };
  },
});

// Get players in a room
export const getPlayers = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

// Clean up old rooms (rooms older than 24 hours)
export const cleanupOldRooms = mutation({
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const oldRooms = await ctx.db
      .query("rooms")
      .withIndex("by_createdAt")
      .filter((q) => q.lt(q.field("createdAt"), oneDayAgo))
      .collect();

    for (const room of oldRooms) {
      // Delete players
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      for (const player of players) {
        await ctx.db.delete(player._id);
      }

      // Delete chat messages
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // Delete room
      await ctx.db.delete(room._id);
    }

    return { deletedCount: oldRooms.length };
  },
});
