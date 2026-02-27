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
// Each location represents a point in the financial investigation
const LOCATIONS: Record<string, {
  id: string;
  name: string;
  description: string;
  icon: string;
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
        objective: "The encrypted database shows a hex-encoded account holder name. Decode the hexadecimal sequence to identify who controls this shell account.",
        data: [
          "╔══════════════════════════════════════╗",
          "║  MERIDIAN BANK - ACCOUNT TERMINAL    ║",
          "╠══════════════════════════════════════╣",
          "║  Account #: 7829-4451-0093           ║",
          "║  Type: Private Wealth Management     ║",
          "║  Status: ACTIVE                      ║",
          "║  Balance: $2,847,500.00              ║",
          "║  Last Activity: 2024-03-15 14:23     ║",
          "╠══════════════════════════════════════╣",
          "║  PRIMARY HOLDER (ENCRYPTED):         ║",
          "║  56 41 4E 43 45                      ║",
          "╚══════════════════════════════════════╝",
        ],
        answer: "VANCE",
      },
      {
        title: "Wire Transfer Log",
        objective: "A suspicious wire transfer was flagged by compliance. The destination is encoded in Base64 format. Decode it to trace where the funds were sent.",
        data: [
          "┌─────────────────────────────────────┐",
          "│ WIRE TRANSFER RECORD                │",
          "├─────────────────────────────────────┤",
          "│ Transfer ID: WT-2024-7829           │",
          "│ Amount: $50,000.00 USD              │",
          "│ Date: 2024-03-15 09:47:22           │",
          "│ Reference: FOUNDATION GRANT         │",
          "│ Auth Code: VKV-8847                 │",
          "├─────────────────────────────────────┤",
          "│ DESTINATION (ENCODED):              │",
          "│ Q0FZTUFOIA==                        │",
          "└─────────────────────────────────────┘",
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
        objective: "The laptop displays a password hint in binary format. Convert each 8-bit binary sequence to ASCII characters to unlock access.",
        data: [
          "┌─────────────────────────────────────┐",
          "│  ████ SYSTEM LOGIN ████             │",
          "├─────────────────────────────────────┤",
          "│  User: V.VOLKOV                     │",
          "│  Last Login: 2024-03-14 23:12       │",
          "│                                     │",
          "│  PASSWORD HINT (BINARY):            │",
          "│  01010000 01000001 01010011 01010011│",
          "│                                     │",
          "│  Attempts remaining: 3              │",
          "└─────────────────────────────────────┘",
        ],
        answer: "PASS",
      },
      {
        title: "Encrypted Email Draft",
        objective: "An unsent email draft contains a hex-encoded meeting location. Decode the coordinates to find where the next handoff occurs.",
        data: [
          "╔═══════════════════════════════════════╗",
          "║  DRAFT - NOT SENT                     ║",
          "╠═══════════════════════════════════════╣",
          "║  From: v.volkov@meridian-pvt.com      ║",
          "║  To: [REDACTED]                       ║",
          "║  Subject: Re: Thursday arrangement    ║",
          "║  Date: 2024-03-15 (draft saved)       ║",
          "╠═══════════════════════════════════════╣",
          "║  Meet at the usual place.             ║",
          "║  Location code: 44 4F 43 4B 53        ║",
          "║  Bring the documents.                 ║",
          "╚═══════════════════════════════════════╝",
        ],
        answer: "DOCKS",
      },
    ],
  },
  warehouse: {
    id: "warehouse",
    name: "Harbor Warehouse 7",
    description: "Shipping records indicate suspicious cargo movements at this facility",
    icon: "warehouse",
    puzzles: [
      {
        title: "Shipping Manifest",
        objective: "A locked container manifest has the contents field encoded in Base64. Decode it to reveal what valuable cargo is being smuggled through the port.",
        data: [
          "┌──────────────────────────────────────┐",
          "│  PACIFIC FREIGHT LOGISTICS           │",
          "│  CONTAINER MANIFEST                  │",
          "├──────────────────────────────────────┤",
          "│  Container #: MSKU-4417-892          │",
          "│  Origin: UNKNOWN (no manifest)       │",
          "│  Destination: Warehouse 7, Berth 12  │",
          "│  Weight: 2,340 kg                    │",
          "│  Customs Status: BYPASSED            │",
          "├──────────────────────────────────────┤",
          "│  CONTENTS (ENCODED):                 │",
          "│  R09MRA==                            │",
          "└──────────────────────────────────────┘",
        ],
        answer: "GOLD",
      },
      {
        title: "Security Access Log",
        objective: "The warehouse security system logged a binary-encoded visitor badge at 2:34 AM. Convert the binary to identify who accessed the facility after hours.",
        data: [
          "╔═════════════════════════════════════════╗",
          "║  WAREHOUSE 7 - ACCESS LOG               ║",
          "╠═════════════════════════════════════════╣",
          "║  Date: 2024-03-15                       ║",
          "║  Entry Time: 02:34:17 AM                ║",
          "║  Exit Time: 03:12:45 AM                 ║",
          "║  Duration: 38 minutes                   ║",
          "║  Door: Loading Bay 3 (rear)             ║",
          "╠═════════════════════════════════════════╣",
          "║  VISITOR BADGE (ENCRYPTED):             ║",
          "║  01001101 01000001 01010010 01001011    ║",
          "╚═════════════════════════════════════════╝",
        ],
        answer: "MARK",
      },
    ],
  },
  office: {
    id: "office",
    name: "Vance Foundation Office",
    description: "The charity's headquarters - where the laundered money trail leads",
    icon: "building-2",
    puzzles: [
      {
        title: "Donation Database",
        objective: "Suspicious donation records show a hex-encoded major donor name. Decode it to uncover who's funneling money through the nonprofit foundation.",
        data: [
          "┌─────────────────────────────────────────┐",
          "│  VANCE FAMILY FOUNDATION               │",
          "│  DONOR MANAGEMENT SYSTEM               │",
          "├─────────────────────────────────────────┤",
          "│  Donation ID: VFF-2024-1001            │",
          "│  Amount: $100,000.00                   │",
          "│  Date: 2024-03-10                      │",
          "│  Method: Wire Transfer (offshore)      │",
          "│  Tax Receipt: ISSUED                   │",
          "│  Audit Flag: HIGH RISK                 │",
          "├─────────────────────────────────────────┤",
          "│  DONOR NAME (ENCODED):                 │",
          "│  534D495448                            │",
          "└─────────────────────────────────────────┘",
        ],
        answer: "SMITH",
      },
      {
        title: "Hidden Fund Allocation",
        objective: "A hidden Excel file contains a Base64-encoded fund name. Decode it to discover what the laundered money is actually being used to purchase.",
        data: [
          "╔═══════════════════════════════════════════╗",
          "║  HIDDEN ALLOCATION - CONFIDENTIAL        ║",
          "╠═══════════════════════════════════════════╣",
          "║  File: allocations_HIDDEN.xlsx           ║",
          "║  Modified: 2024-03-14 11:47              ║",
          "║  Modified By: E.VANCE                    ║",
          "║                                          ║",
          "║  Fund Status: CONCEALED                  ║",
          "║  Total Amount: $4,200,000.00             ║",
          "║  Source: Foundation reserves             ║",
          "╠═══════════════════════════════════════════╣",
          "║  PURCHASE TARGET (ENCODED):              ║",
          "║  QUlSQ1JBRlQ=                            ║",
          "╚═══════════════════════════════════════════╝",
        ],
        answer: "AIRCRAFT",
      },
    ],
  },
  marina: {
    id: "marina",
    name: "Sunset Marina",
    description: "A luxury yacht registered to a shell company is docked at slip 47",
    icon: "ship",
    puzzles: [
      {
        title: "Vessel Registration",
        objective: "The vessel registration papers show a hex-encoded yacht name. Decode it to identify which vessel is being used for offshore transfers.",
        data: [
          "┌───────────────────────────────────────┐",
          "│  HARBOR MASTER - VESSEL REGISTRY      │",
          "├───────────────────────────────────────┤",
          "│  Slip #: 47                           │",
          "│  Vessel Type: 85ft Motor Yacht        │",
          "│  Registration: CAYMAN ISLANDS         │",
          "│  Owner: Pacific Holdings Ltd (shell)  │",
          "│  Captain: [CLASSIFIED]                │",
          "│  Docking Fee: PREPAID 12 MONTHS       │",
          "├───────────────────────────────────────┤",
          "│  VESSEL NAME (ENCODED):               │",
          "│  57415645                             │",
          "└───────────────────────────────────────┘",
        ],
        answer: "WAVE",
      },
      {
        title: "Captain's Navigation Log",
        objective: "The captain's digital navigation log shows a binary-encoded destination port. Decode it to find where the yacht is scheduled to travel next.",
        data: [
          "╔════════════════════════════════════════╗",
          "║  NAVIGATION LOG - CONFIDENTIAL         ║",
          "╠════════════════════════════════════════╣",
          "║  Date: 2024-03-15                      ║",
          "║  Current Position: Marina Slip 47     ║",
          "║  Fuel: 95% (full tank)                ║",
          "║  Cargo: SPECIAL FREIGHT               ║",
          "║  Departure: Thursday 0600 hrs         ║",
          "╠════════════════════════════════════════╣",
          "║  NEXT PORT (ENCRYPTED):                ║",
          "║  01000011 01010101 01000010 01000001   ║",
          "╚════════════════════════════════════════╝",
        ],
        answer: "CUBA",
      },
    ],
  },
  airport: {
    id: "airport",
    name: "Regional Airfield",
    description: "Private planes have been making unscheduled flights to offshore destinations",
    icon: "plane",
    puzzles: [
      {
        title: "Flight Manifest",
        objective: "A suspicious private flight manifest has Base64-encoded cargo information. Decode it to reveal what's being transported across the border.",
        data: [
          "┌────────────────────────────────────────┐",
          "│  PRIVATE AVIATION - FLIGHT PLAN       │",
          "├────────────────────────────────────────┤",
          "│  Flight #: N738VN                     │",
          "│  Aircraft: Gulfstream G650            │",
          "│  Type: Private Charter                │",
          "│  Departure: Regional Airfield         │",
          "│  Destination: Grand Cayman (GCM)      │",
          "│  Passengers: 2 (names withheld)       │",
          "│  Customs: PRE-CLEARED                 │",
          "├────────────────────────────────────────┤",
          "│  CARGO MANIFEST (ENCODED):            │",
          "│  Q0FTSQ==                             │",
          "└────────────────────────────────────────┘",
        ],
        answer: "CASH",
      },
      {
        title: "Pilot Identification",
        objective: "The pilot uses a hex-encoded callsign for radio communications. Decode it to identify the pilot's operational codename.",
        data: [
          "╔═════════════════════════════════════════╗",
          "║  PILOT REGISTRY - RESTRICTED           ║",
          "╠═════════════════════════════════════════╣",
          "║  License Type: Commercial ATP          ║",
          "║  Clearance: LEVEL 4                    ║",
          "║  Base: Regional Airfield               ║",
          "║  Total Hours: 8,400+                   ║",
          "║  Specialization: International routes  ║",
          "║  Employer: Pacific Aviation LLC        ║",
          "╠═════════════════════════════════════════╣",
          "║  RADIO CALLSIGN (ENCODED):             ║",
          "║  48 41 57 4B                           ║",
          "╚═════════════════════════════════════════╝",
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
