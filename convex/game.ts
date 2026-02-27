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

// Puzzle data types for table rendering
interface TableData {
  type: 'table';
  header: string;
  columns: string[];
  rows: (string | { value: string; badge?: 'active' | 'inactive' | 'warning' | 'flag'; flag?: string; hint?: string })[][];
  footer?: { label: string; value: string };
  encodedField: { row: number; col: number; hint: string };
}

interface RecordData {
  type: 'record';
  header: string;
  fields: { label: string; value: string; highlight?: boolean }[];
  encodedField: { label: string; value: string; hint: string };
}

type PuzzleData = TableData | RecordData;

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
    data: PuzzleData;
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
        title: "Account Holder Database",
        objective: "The encrypted database shows a hex-encoded account holder name. Decode the hexadecimal sequence to identify who controls the flagged shell account.",
        data: {
          type: "table",
          header: "MERIDIAN BANK - PRIVATE ACCOUNTS",
          columns: ["Account Holder", "Account #", "Location", "Status", "Balance"],
          rows: [
            ["R. Morrison", "7829-4451-0091", { value: "Geneva, CH", flag: "🇨🇭" }, { value: "Active", badge: "active" }, "$1,250,000.00"],
            ["T. Chen", "7829-4451-0092", { value: "Singapore", flag: "🇸🇬" }, { value: "Active", badge: "active" }, "$890,000.00"],
            [{ value: "56 41 4E 43 45", hint: "HEX" }, "7829-4451-0093", { value: "Cayman Is.", flag: "🇰🇾" }, { value: "Flagged", badge: "flag" }, "$2,847,500.00"],
            ["M. Santos", "7829-4451-0094", { value: "Panama City", flag: "🇵🇦" }, { value: "Inactive", badge: "inactive" }, "$0.00"],
            ["K. Andersen", "7829-4451-0095", { value: "Zurich, CH", flag: "🇨🇭" }, { value: "Active", badge: "active" }, "$3,100,000.00"],
          ],
          footer: { label: "Total Assets Under Management", value: "$8,087,500.00" },
          encodedField: { row: 2, col: 0, hint: "Account holder name is hex-encoded" },
        },
        answer: "VANCE",
      },
      {
        title: "Wire Transfer Log",
        objective: "A suspicious wire transfer was flagged by compliance. The destination is encoded in Base64 format. Decode it to trace where the funds were sent.",
        data: {
          type: "table",
          header: "WIRE TRANSFER HISTORY",
          columns: ["Transfer ID", "Date", "Sender", "Destination", "Amount", "Status"],
          rows: [
            ["WT-2024-7826", "2024-03-13", "Morrison R.", "Geneva HQ", "$50,000.00", { value: "Cleared", badge: "active" }],
            ["WT-2024-7827", "2024-03-14", "Chen T.", "Singapore Branch", "$125,000.00", { value: "Cleared", badge: "active" }],
            ["WT-2024-7828", "2024-03-14", "Andersen K.", "Zurich Office", "$200,000.00", { value: "Cleared", badge: "active" }],
            ["WT-2024-7829", "2024-03-15", "Account 0093", { value: "Q0FZTUFOIA==", hint: "BASE64" }, "$750,000.00", { value: "Flagged", badge: "warning" }],
            ["WT-2024-7830", "2024-03-15", "Santos M.", "Panama City", "$0.00", { value: "Blocked", badge: "inactive" }],
          ],
          footer: { label: "Total Transfers (This Week)", value: "$1,125,000.00" },
          encodedField: { row: 3, col: 3, hint: "Destination is Base64-encoded" },
        },
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
        title: "Guest Registry Terminal",
        objective: "The laptop displays a password hint in binary format. Find the guest with the encoded room access code and convert the binary to ASCII.",
        data: {
          type: "table",
          header: "GRAND PACIFIC - GUEST REGISTRY",
          columns: ["Guest Name", "Room", "Check-In", "Status", "Access Code"],
          rows: [
            ["J. Williams", "1845", "2024-03-12", { value: "Checked Out", badge: "inactive" }, "ALPHA"],
            ["S. Nakamura", "1846", "2024-03-13", { value: "Active", badge: "active" }, "DELTA"],
            ["V. Volkov", "1847", "2024-03-14", { value: "Active", badge: "active" }, { value: "01010000 01000001 01010011 01010011", hint: "BINARY" }],
            ["M. Petrova", "1848", "2024-03-14", { value: "Active", badge: "active" }, "SIGMA"],
            ["C. Rivera", "1849", "2024-03-15", { value: "Active", badge: "active" }, "OMEGA"],
          ],
          footer: { label: "Penthouse Floor Occupancy", value: "4/5 Rooms" },
          encodedField: { row: 2, col: 4, hint: "Access code is binary-encoded" },
        },
        answer: "PASS",
      },
      {
        title: "Guest Communications Log",
        objective: "An unsent email draft contains a hex-encoded meeting location. Decode it to find where the next handoff occurs.",
        data: {
          type: "table",
          header: "HOTEL COMMUNICATIONS LOG",
          columns: ["Time", "Guest", "Type", "Recipient", "Subject"],
          rows: [
            ["09:15", "J. Williams", "Email", "office@corp.com", "Meeting Confirmed"],
            ["11:30", "S. Nakamura", "Call", "+81-3-XXXX", "Business Inquiry"],
            ["14:22", "V. Volkov", "Draft", "[REDACTED]", { value: "44 4F 43 4B 53", hint: "HEX" }],
            ["16:45", "M. Petrova", "Email", "travel@agency.ru", "Flight Change"],
            ["18:00", "C. Rivera", "Call", "+52-55-XXXX", "Room Service"],
          ],
          footer: { label: "Draft messages pending", value: "1" },
          encodedField: { row: 2, col: 4, hint: "Meeting location hex-encoded in subject" },
        },
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
        title: "Container Manifest",
        objective: "A locked container manifest has the contents field encoded in Base64. Decode it to reveal what valuable cargo is being smuggled through the port.",
        data: {
          type: "table",
          header: "PACIFIC FREIGHT - CONTAINER INVENTORY",
          columns: ["Container #", "Origin", "Weight", "Contents", "Customs"],
          rows: [
            ["MSKU-4417-890", { value: "Shanghai, CN", flag: "🇨🇳" }, "4,200 kg", "Electronics", { value: "Cleared", badge: "active" }],
            ["MSKU-4417-891", { value: "Hamburg, DE", flag: "🇩🇪" }, "2,100 kg", "Auto Parts", { value: "Cleared", badge: "active" }],
            ["MSKU-4417-892", { value: "Unknown", flag: "❓" }, "2,340 kg", { value: "R09MRA==", hint: "BASE64" }, { value: "Bypassed", badge: "warning" }],
            ["MSKU-4417-893", { value: "Rotterdam, NL", flag: "🇳🇱" }, "5,800 kg", "Machinery", { value: "Cleared", badge: "active" }],
            ["MSKU-4417-894", { value: "Tokyo, JP", flag: "🇯🇵" }, "1,950 kg", "Textiles", { value: "Pending", badge: "inactive" }],
          ],
          footer: { label: "Total Containers in Bay 7", value: "5" },
          encodedField: { row: 2, col: 3, hint: "Contents field is Base64-encoded" },
        },
        answer: "GOLD",
      },
      {
        title: "After-Hours Access Log",
        objective: "The warehouse security system logged a binary-encoded visitor badge at 2:34 AM. Convert the binary to identify who accessed the facility.",
        data: {
          type: "table",
          header: "WAREHOUSE 7 - SECURITY ACCESS",
          columns: ["Time", "Badge ID", "Door", "Duration", "Status"],
          rows: [
            ["18:30:00", "STAFF-001", "Main Gate", "8h 00m", { value: "Staff", badge: "active" }],
            ["22:15:42", "GUARD-117", "Patrol Entry", "6h 00m", { value: "Security", badge: "active" }],
            ["02:34:17", { value: "01001101 01000001 01010010 01001011", hint: "BINARY" }, "Loading Bay 3", "0h 38m", { value: "Unknown", badge: "warning" }],
            ["05:45:00", "STAFF-023", "Main Gate", "12h 00m", { value: "Staff", badge: "active" }],
            ["06:00:00", "MGMT-002", "Executive Entry", "10h 00m", { value: "Manager", badge: "active" }],
          ],
          footer: { label: "Unauthorized Access Events", value: "1" },
          encodedField: { row: 2, col: 1, hint: "Badge ID is binary-encoded" },
        },
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
        title: "Donor Database",
        objective: "Suspicious donation records show a hex-encoded major donor name. Decode it to uncover who's funneling money through the nonprofit foundation.",
        data: {
          type: "table",
          header: "VANCE FOUNDATION - DONOR REGISTRY",
          columns: ["Donor Name", "Donation ID", "Amount", "Method", "Audit Flag"],
          rows: [
            ["Johnson Family Trust", "VFF-2024-0998", "$25,000.00", "Check", { value: "Clear", badge: "active" }],
            ["Pacific Holdings LLC", "VFF-2024-0999", "$50,000.00", "Wire", { value: "Review", badge: "inactive" }],
            ["Meridian Partners", "VFF-2024-1000", "$75,000.00", "Wire", { value: "Review", badge: "inactive" }],
            [{ value: "534D495448", hint: "HEX" }, "VFF-2024-1001", "$100,000.00", "Offshore Wire", { value: "High Risk", badge: "warning" }],
            ["Harbor Associates", "VFF-2024-1002", "$15,000.00", "Check", { value: "Clear", badge: "active" }],
          ],
          footer: { label: "Total Donations (March 2024)", value: "$265,000.00" },
          encodedField: { row: 3, col: 0, hint: "Donor name is hex-encoded" },
        },
        answer: "SMITH",
      },
      {
        title: "Fund Allocation Records",
        objective: "A hidden file contains a Base64-encoded purchase target. Decode it to discover what the laundered money is actually being used for.",
        data: {
          type: "table",
          header: "CONFIDENTIAL - FUND ALLOCATIONS",
          columns: ["Allocation ID", "Amount", "Category", "Purpose", "Visibility"],
          rows: [
            ["ALLOC-2024-001", "$150,000.00", "Education", "Scholarships", { value: "Public", badge: "active" }],
            ["ALLOC-2024-002", "$200,000.00", "Healthcare", "Medical Equipment", { value: "Public", badge: "active" }],
            ["ALLOC-2024-003", "$85,000.00", "Community", "Youth Programs", { value: "Public", badge: "active" }],
            ["ALLOC-2024-004", "$4,200,000.00", "Special Projects", { value: "QUlSQ1JBRlQ=", hint: "BASE64" }, { value: "Hidden", badge: "warning" }],
            ["ALLOC-2024-005", "$65,000.00", "Admin", "Operating Costs", { value: "Internal", badge: "inactive" }],
          ],
          footer: { label: "Total Allocated (Hidden)", value: "$4,200,000.00" },
          encodedField: { row: 3, col: 3, hint: "Purpose is Base64-encoded" },
        },
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
        title: "Vessel Registry",
        objective: "The vessel registration papers show a hex-encoded yacht name. Decode it to identify which vessel is being used for offshore transfers.",
        data: {
          type: "table",
          header: "HARBOR MASTER - VESSEL REGISTRY",
          columns: ["Vessel Name", "Slip #", "Type", "Owner", "Registration"],
          rows: [
            ["Sea Breeze", "44", "45ft Sailboat", "J. Morrison", { value: "Florida, US", flag: "🇺🇸" }],
            ["Neptune's Pride", "45", "60ft Cruiser", "Harbor Club LLC", { value: "Delaware, US", flag: "🇺🇸" }],
            ["Aqua Dream", "46", "55ft Catamaran", "Pacific Tours Inc", { value: "Bahamas", flag: "🇧🇸" }],
            [{ value: "57415645", hint: "HEX" }, "47", "85ft Motor Yacht", "Pacific Holdings Ltd", { value: "Cayman Is.", flag: "🇰🇾" }],
            ["Sunset Chaser", "48", "40ft Sport Fish", "M. Rodriguez", { value: "California, US", flag: "🇺🇸" }],
          ],
          footer: { label: "Slips 44-48 Occupancy", value: "5/5" },
          encodedField: { row: 3, col: 0, hint: "Vessel name is hex-encoded" },
        },
        answer: "WAVE",
      },
      {
        title: "Navigation Logs",
        objective: "The captain's digital navigation log shows a binary-encoded destination port. Decode it to find where the yacht is scheduled to travel next.",
        data: {
          type: "table",
          header: "SLIP 47 - NAVIGATION HISTORY",
          columns: ["Date", "Departure", "Destination", "Duration", "Cargo"],
          rows: [
            ["2024-02-28", "Sunset Marina", "Nassau, BS", "18h", "None Declared"],
            ["2024-03-05", "Nassau, BS", "Sunset Marina", "16h", "None Declared"],
            ["2024-03-10", "Sunset Marina", "Grand Cayman", "22h", "Special Freight"],
            ["2024-03-13", "Grand Cayman", "Sunset Marina", "20h", "None Declared"],
            ["2024-03-18", "Sunset Marina", { value: "01000011 01010101 01000010 01000001", hint: "BINARY" }, "Est. 24h", "CLASSIFIED"],
          ],
          footer: { label: "Next Scheduled Departure", value: "Thursday 0600" },
          encodedField: { row: 4, col: 2, hint: "Destination is binary-encoded" },
        },
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
        title: "Flight Manifest Database",
        objective: "A suspicious private flight manifest has Base64-encoded cargo information. Decode it to reveal what's being transported across the border.",
        data: {
          type: "table",
          header: "PRIVATE AVIATION - FLIGHT LOG",
          columns: ["Flight #", "Aircraft", "Destination", "Cargo", "Customs"],
          rows: [
            ["N442TX", "Citation X", { value: "Miami, FL", flag: "🇺🇸" }, "Documents", { value: "Cleared", badge: "active" }],
            ["N556PK", "Learjet 75", { value: "Cancun, MX", flag: "🇲🇽" }, "None", { value: "Cleared", badge: "active" }],
            ["N612WC", "Phenom 300", { value: "Nassau, BS", flag: "🇧🇸" }, "Equipment", { value: "Cleared", badge: "active" }],
            ["N738VN", "Gulfstream G650", { value: "Grand Cayman", flag: "🇰🇾" }, { value: "Q0FTSQ==", hint: "BASE64" }, { value: "Pre-Cleared", badge: "warning" }],
            ["N891HL", "King Air 350", { value: "San Juan, PR", flag: "🇵🇷" }, "Medical", { value: "Cleared", badge: "active" }],
          ],
          footer: { label: "Flights Awaiting Inspection", value: "1" },
          encodedField: { row: 3, col: 3, hint: "Cargo manifest is Base64-encoded" },
        },
        answer: "CASH",
      },
      {
        title: "Pilot Registry",
        objective: "The pilot uses a hex-encoded callsign for radio communications. Decode it to identify the pilot's operational codename.",
        data: {
          type: "table",
          header: "PILOT CERTIFICATION DATABASE",
          columns: ["License #", "Name", "Callsign", "Rating", "Clearance"],
          rows: [
            ["ATP-78421", "R. Martinez", "EAGLE", "Commercial", { value: "Level 2", badge: "active" }],
            ["ATP-78422", "S. O'Brien", "FALCON", "Commercial", { value: "Level 2", badge: "active" }],
            ["ATP-78423", "J. Kim", "RAVEN", "Commercial", { value: "Level 3", badge: "active" }],
            ["ATP-78424", "[CLASSIFIED]", { value: "48 41 57 4B", hint: "HEX" }, "ATP (8400+ hrs)", { value: "Level 4", badge: "warning" }],
            ["ATP-78425", "M. Thompson", "SPARROW", "Private", { value: "Level 1", badge: "inactive" }],
          ],
          footer: { label: "Classified Personnel", value: "1" },
          encodedField: { row: 3, col: 2, hint: "Callsign is hex-encoded" },
        },
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
