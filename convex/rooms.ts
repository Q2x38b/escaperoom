import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

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

    const now = Date.now();

    // Create the room
    const roomId = await ctx.db.insert("rooms", {
      code,
      hostId: args.odentifier,
      phase: "waiting",
      currentPuzzle: 0,
      solvedPuzzles: [],
      sharedInputs: {},
      createdAt: now,
    });

    // Add the host as a player
    await ctx.db.insert("players", {
      roomId,
      odentifier: args.odentifier,
      nickname: args.nickname,
      isHost: true,
      isReady: true,
      joinedAt: now,
      lastSeen: now,
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

    const now = Date.now();

    // Check if player already in room (allow rejoin even if game started)
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .filter((q) => q.eq(q.field("odentifier"), args.odentifier))
      .first();

    if (existingPlayer) {
      // Update nickname and lastSeen if rejoining
      const updates: { nickname: string; lastSeen: number; location?: string; locationPuzzleProgress?: number; locationSolvedPuzzles?: number[] } = {
        nickname: args.nickname,
        lastSeen: now,
      };

      // If game is in progress with locations and player doesn't have a location, assign one
      if (room.useLocations && room.phase === "playing" && !existingPlayer.location) {
        // Get all players to find which locations are taken
        const allPlayers = await ctx.db
          .query("players")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();

        const usedLocations = new Set(allPlayers.map(p => p.location).filter(Boolean));
        const allLocations = ["bank", "hotel", "warehouse", "office", "marina", "airport"];

        // Find an available location or pick one randomly if all are used
        let availableLocation = allLocations.find(loc => !usedLocations.has(loc));
        if (!availableLocation) {
          // All locations taken, pick a random one
          availableLocation = allLocations[Math.floor(Math.random() * allLocations.length)];
        }

        updates.location = availableLocation;
        updates.locationPuzzleProgress = 0;
        updates.locationSolvedPuzzles = [];
      }

      await ctx.db.patch(existingPlayer._id, updates);
      return { roomId: room._id, code: room.code };
    }

    // Check if room is locked - this is the primary control for new joins
    if (room.isLocked) {
      throw new Error("Room is locked");
    }

    // Check player count (max 6)
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    if (players.length >= 6) {
      throw new Error("Room is full");
    }

    // Add player
    await ctx.db.insert("players", {
      roomId: room._id,
      odentifier: args.odentifier,
      nickname: args.nickname,
      isHost: false,
      isReady: true,
      joinedAt: now,
      lastSeen: now,
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

// Player heartbeat - update lastSeen timestamp
export const heartbeat = mutation({
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
      await ctx.db.patch(player._id, { lastSeen: Date.now() });
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

// Cleanup inactive players (haven't been seen in 2 minutes)
// This runs as a scheduled job
export const cleanupInactivePlayers = internalMutation({
  handler: async (ctx) => {
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

    // Get all inactive players
    const inactivePlayers = await ctx.db
      .query("players")
      .withIndex("by_lastSeen")
      .filter((q) => q.lt(q.field("lastSeen"), twoMinutesAgo))
      .collect();

    const affectedRoomIds = new Set<string>();

    // Delete inactive players
    for (const player of inactivePlayers) {
      affectedRoomIds.add(player.roomId);
      await ctx.db.delete(player._id);
    }

    // Check affected rooms and clean up empty ones
    for (const roomIdStr of affectedRoomIds) {
      const roomId = roomIdStr as any;
      const room = await ctx.db.get(roomId);
      if (!room) continue;

      const remainingPlayers = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .collect();

      if (remainingPlayers.length === 0) {
        // Delete chat messages
        const messages = await ctx.db
          .query("chatMessages")
          .withIndex("by_room", (q) => q.eq("roomId", roomId))
          .collect();

        for (const msg of messages) {
          await ctx.db.delete(msg._id);
        }

        // Delete room
        await ctx.db.delete(roomId);
      } else {
        // Check if host was removed, transfer if needed
        const hasHost = remainingPlayers.some(p => p.isHost);
        if (!hasHost) {
          const newHost = remainingPlayers[0];
          await ctx.db.patch(newHost._id, { isHost: true });
          await ctx.db.patch(roomId, { hostId: newHost.odentifier });
        }
      }
    }

    return {
      removedPlayers: inactivePlayers.length,
      affectedRooms: affectedRoomIds.size,
    };
  },
});

// Kick a player from the room (host only)
export const kickPlayer = mutation({
  args: {
    roomId: v.id("rooms"),
    hostIdentifier: v.string(),
    targetIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Verify the requester is the host
    if (room.hostId !== args.hostIdentifier) {
      throw new Error("Only the host can kick players");
    }

    // Can't kick yourself
    if (args.hostIdentifier === args.targetIdentifier) {
      throw new Error("Cannot kick yourself");
    }

    // Find and remove the player
    const player = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("odentifier"), args.targetIdentifier))
      .first();

    if (player) {
      await ctx.db.delete(player._id);
      return { success: true, kickedPlayer: player.nickname };
    }

    return { success: false };
  },
});

// Close room and kick all players (host only)
export const closeRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    hostIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Verify the requester is the host
    if (room.hostId !== args.hostIdentifier) {
      throw new Error("Only the host can close the room");
    }

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

// Lock/unlock room (host only)
export const setRoomLock = mutation({
  args: {
    roomId: v.id("rooms"),
    hostIdentifier: v.string(),
    isLocked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Verify the requester is the host
    if (room.hostId !== args.hostIdentifier) {
      throw new Error("Only the host can lock/unlock the room");
    }

    await ctx.db.patch(args.roomId, { isLocked: args.isLocked });

    return { success: true, isLocked: args.isLocked };
  },
});

// End game and return to waiting room (host only)
export const endGame = mutation({
  args: {
    roomId: v.id("rooms"),
    hostIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // Verify the requester is the host
    if (room.hostId !== args.hostIdentifier) {
      throw new Error("Only the host can end the game");
    }

    // Reset room to waiting state by replacing the document
    // We need to use replace instead of patch because Convex doesn't allow undefined values in patch
    await ctx.db.replace(args.roomId, {
      code: room.code,
      hostId: room.hostId,
      phase: "waiting",
      currentPuzzle: 0,
      solvedPuzzles: [],
      sharedInputs: {},
      isLocked: room.isLocked,
      createdAt: room.createdAt,
      // Optional fields are omitted to clear them: startTime, finalPasscode, completionTime, typingPlayer
    });

    return { success: true };
  },
});

// Manual cleanup trigger (can be called by client if needed)
export const triggerCleanup = mutation({
  handler: async (ctx) => {
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

    // Get all rooms
    const rooms = await ctx.db.query("rooms").collect();
    let cleanedRooms = 0;

    for (const room of rooms) {
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      // Filter out inactive players
      const inactivePlayers = players.filter(p => p.lastSeen < twoMinutesAgo);

      for (const player of inactivePlayers) {
        await ctx.db.delete(player._id);
      }

      // Check remaining active players
      const activePlayers = players.filter(p => p.lastSeen >= twoMinutesAgo);

      if (activePlayers.length === 0) {
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
        cleanedRooms++;
      } else {
        // Ensure there's still a host
        const hasHost = activePlayers.some(p => p.isHost);
        if (!hasHost) {
          const newHost = activePlayers[0];
          await ctx.db.patch(newHost._id, { isHost: true });
          await ctx.db.patch(room._id, { hostId: newHost.odentifier });
        }
      }
    }

    return { cleanedRooms };
  },
});
