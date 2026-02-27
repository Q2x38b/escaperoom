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

// Puzzle data types for varied rendering
interface TableData {
  type: 'table';
  header: string;
  columns: string[];
  rows: (string | { value: string; badge?: 'active' | 'inactive' | 'warning' | 'flag'; flag?: string; hint?: string })[][];
  footer?: { label: string; value: string };
  encodedField: { row: number; col: number; hint: string };
}

interface TerminalData {
  type: 'terminal';
  prompt: string;
  lines: { prefix?: string; content: string; encoded?: boolean; style?: 'success' | 'error' | 'warning' | 'info' }[];
  encodedHint: string;
}

interface DocumentData {
  type: 'document';
  letterhead: string;
  date: string;
  reference: string;
  body: string[];
  encodedLine: { index: number; hint: string };
  signature?: { name: string; title: string };
}

interface EmailData {
  type: 'email';
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string[];
  encodedLine: { index: number; hint: string };
  attachments?: string[];
}

interface LogData {
  type: 'log';
  header: string;
  entries: { timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string; encoded?: boolean }[];
  encodedHint: string;
}

type PuzzleData = TableData | TerminalData | DocumentData | EmailData | LogData;

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
        title: "Vault Access Terminal",
        objective: "The vault security terminal shows access attempts. One user's name is encoded in Base64. Decode it to find who accessed the vault after hours.",
        data: {
          type: "terminal",
          prompt: "MERIDIAN SECURE VAULT v3.2.1",
          lines: [
            { content: "Initializing secure connection...", style: "info" },
            { content: "Authentication verified", style: "success" },
            { content: "Loading access history...", style: "info" },
            { prefix: "[2024-03-14 22:15]", content: "ACCESS GRANTED - Morrison, R. (Level 3)" },
            { prefix: "[2024-03-14 23:47]", content: "ACCESS DENIED - Invalid biometric" },
            { prefix: "[2024-03-15 01:23]", content: "ACCESS GRANTED - Q0FSVEVS (Level 5)", encoded: true },
            { prefix: "[2024-03-15 01:58]", content: "VAULT CONTENTS MODIFIED", style: "warning" },
            { prefix: "[2024-03-15 02:14]", content: "ACCESS TERMINATED - Session timeout" },
            { content: "End of log. 4 events found.", style: "info" },
          ],
          encodedHint: "Username is Base64-encoded",
        },
        answer: "CARTER",
      },
      {
        title: "Wire Transfer Authorization",
        objective: "A confidential memo authorizes a large transfer. The destination country is encoded in binary. Decode it to trace the money.",
        data: {
          type: "document",
          letterhead: "MERIDIAN BANK - INTERNAL MEMORANDUM",
          date: "March 15, 2024",
          reference: "WIRE-AUTH-2024-0892",
          body: [
            "TO: Wire Transfer Department",
            "FROM: V. Volkov, Senior VP",
            "RE: Priority Transfer Authorization",
            "",
            "This memo authorizes the immediate transfer of USD $2,500,000",
            "from Account #7829-4451-0093 to the following destination:",
            "",
            "Receiving Bank: First Caribbean International",
            "Destination: 01010000 01000001 01001110 01000001 01001101 01000001",
            "Reference: FOUNDATION-GRANT-Q1",
            "",
            "This transfer has been pre-approved by the board and should",
            "bypass standard compliance review procedures.",
          ],
          encodedLine: { index: 8, hint: "Destination country is binary-encoded" },
          signature: { name: "Viktor Volkov", title: "Senior Vice President" },
        },
        answer: "PANAMA",
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
        title: "Intercepted Email",
        objective: "Hotel security intercepted a suspicious email from Volkov's laptop. The meeting location mentioned in the body is hex-encoded.",
        data: {
          type: "email",
          from: "v.volkov@meridian-pvt.com",
          to: "contact@pacificholdings.ky",
          subject: "Re: Thursday Arrangement - URGENT",
          date: "March 15, 2024 14:22",
          body: [
            "The package is ready for pickup.",
            "",
            "Meet at the usual place tomorrow at midnight.",
            "Location code: 44 4F 43 4B 53",
            "",
            "Bring the documents we discussed. Make sure",
            "you are not followed. Use the back entrance.",
            "",
            "Destroy this message after reading.",
          ],
          encodedLine: { index: 3, hint: "Location code is hex-encoded" },
          attachments: ["route_map.pdf.encrypted", "contacts_backup.vcf"],
        },
        answer: "DOCKS",
      },
      {
        title: "Room Service System",
        objective: "The hotel's room service system logged suspicious orders. One item description is Base64-encoded. Decode it to find what was really delivered.",
        data: {
          type: "log",
          header: "ROOM SERVICE - ORDER LOG",
          entries: [
            { timestamp: "2024-03-14 19:30:22", level: "info", message: "Room 1845: Dinner service - Steak, Wine" },
            { timestamp: "2024-03-14 20:15:47", level: "info", message: "Room 1847: Champagne delivery" },
            { timestamp: "2024-03-14 22:08:33", level: "warn", message: "Room 1847: Special request - VIP clearance required" },
            { timestamp: "2024-03-14 23:45:19", level: "info", message: "Room 1847: Package delivery - S0VZUw==", encoded: true },
            { timestamp: "2024-03-15 01:12:55", level: "debug", message: "Room 1847: DND activated - Do not enter" },
            { timestamp: "2024-03-15 08:30:00", level: "error", message: "Room 1847: Checkout missed - Guest departed early" },
          ],
          encodedHint: "Package contents Base64-encoded",
        },
        answer: "KEYS",
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
        title: "Forklift Terminal",
        objective: "The warehouse forklift tracking system shows movement logs. One operator ID is hex-encoded. Decode it to identify the unauthorized operator.",
        data: {
          type: "terminal",
          prompt: "WAREHOUSE MGMT SYSTEM v2.1.4",
          lines: [
            { content: "=== FORKLIFT MOVEMENT LOG ===", style: "info" },
            { content: "Date: 2024-03-15" },
            { prefix: "18:30:00", content: "FL-01 | Op: STAFF-001 | Bay 1 -> Bay 3" },
            { prefix: "19:45:12", content: "FL-02 | Op: STAFF-017 | Bay 5 -> Loading" },
            { prefix: "22:30:55", content: "FL-01 | Op: STAFF-001 | Bay 3 -> Storage" },
            { prefix: "02:34:17", content: "FL-03 | Op: 4D41524B | Bay 7 -> Exit", encoded: true },
            { prefix: "02:35:22", content: "ALERT: Unauthorized movement detected", style: "error" },
            { prefix: "02:36:01", content: "Security notified - No response", style: "warning" },
            { content: "=== END OF LOG ===" },
          ],
          encodedHint: "Operator ID is hex-encoded",
        },
        answer: "MARK",
      },
      {
        title: "Shipping Label Scanner",
        objective: "A damaged shipping label was scanned. The destination city is encoded in binary. Decode it to find where the cargo was headed.",
        data: {
          type: "document",
          letterhead: "PACIFIC FREIGHT LOGISTICS - SHIPPING LABEL",
          date: "Ship Date: March 15, 2024",
          reference: "Tracking #: PFL-2024-78923",
          body: [
            "FROM:",
            "  Harbor Warehouse 7",
            "  Berth 12, Container MSKU-4417-892",
            "  Port of Los Angeles, CA 90731",
            "",
            "TO:",
            "  Pacific Holdings Ltd",
            "  Industrial Zone, Warehouse District",
            "  01001101 01001001 01000001 01001101 01001001",
            "",
            "CONTENTS: Industrial Equipment (FRAGILE)",
            "WEIGHT: 2,340 kg | DECLARED VALUE: $50,000",
            "SPECIAL INSTRUCTIONS: NO INSPECTION",
          ],
          encodedLine: { index: 8, hint: "Destination city is binary-encoded" },
        },
        answer: "MIAMI",
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
        title: "Confidential Memo",
        objective: "A shredded memo was reconstructed. The purchase item mentioned is Base64-encoded. Decode it to discover what the foundation is secretly buying.",
        data: {
          type: "document",
          letterhead: "VANCE FAMILY FOUNDATION - CONFIDENTIAL",
          date: "March 14, 2024",
          reference: "Internal Memo #VFF-2024-CONF-17",
          body: [
            "TO: Board of Directors (EYES ONLY)",
            "FROM: E. Vance, Executive Director",
            "RE: Special Acquisition Fund",
            "",
            "Following our discussion, I have secured the funds",
            "for our special project. Total: $4,200,000",
            "",
            "The purchase will be listed as 'educational equipment'",
            "but the actual item is: QUlSQ1JBRlQ=",
            "",
            "All documentation will route through our Cayman entity.",
            "Destroy this memo after reading.",
          ],
          encodedLine: { index: 8, hint: "Actual purchase is Base64-encoded" },
          signature: { name: "Eleanor Vance", title: "Executive Director" },
        },
        answer: "AIRCRAFT",
      },
      {
        title: "IT System Logs",
        objective: "The office IT system shows someone deleted files late at night. The deleted folder name is binary-encoded. Decode it to find what they tried to hide.",
        data: {
          type: "log",
          header: "FILE SERVER ACTIVITY LOG",
          entries: [
            { timestamp: "2024-03-14 17:30:00", level: "info", message: "User E.VANCE logged in from Office-PC-01" },
            { timestamp: "2024-03-14 17:45:22", level: "info", message: "Accessed: /Foundation/Donors/2024/" },
            { timestamp: "2024-03-14 18:12:08", level: "info", message: "Modified: allocations_report.xlsx" },
            { timestamp: "2024-03-14 23:55:33", level: "warn", message: "After-hours login detected: E.VANCE" },
            { timestamp: "2024-03-14 23:58:47", level: "error", message: "DELETE: /Foundation/01000010 01010010 01001001 01000010 01000101 01010011/", encoded: true },
            { timestamp: "2024-03-15 00:01:12", level: "info", message: "Recycle bin emptied - Permanent deletion" },
            { timestamp: "2024-03-15 00:02:30", level: "info", message: "User E.VANCE logged out" },
          ],
          encodedHint: "Deleted folder name is binary-encoded",
        },
        answer: "BRIBES",
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
        title: "Radio Transmission Log",
        objective: "The marina intercepted radio transmissions from Slip 47. The destination port mentioned is binary-encoded. Decode it.",
        data: {
          type: "terminal",
          prompt: "VHF MARINE RADIO - CHANNEL 16 LOG",
          lines: [
            { content: "=== RECORDED TRANSMISSIONS ===", style: "info" },
            { prefix: "[22:15:33]", content: "Slip 47 -> Coast Guard: Routine check-in" },
            { prefix: "[22:18:45]", content: "Coast Guard -> Slip 47: Copy. Safe travels." },
            { prefix: "[23:45:12]", content: "Slip 47 -> Unknown: Package secured. Ready to depart." },
            { prefix: "[23:47:08]", content: "Unknown -> Slip 47: Confirmed. Head to 01000011 01010101 01000010 01000001", encoded: true },
            { prefix: "[23:48:22]", content: "Slip 47 -> Unknown: Copy. ETA 24 hours." },
            { prefix: "[23:50:00]", content: "TRANSMISSION ENDED", style: "warning" },
            { content: "=== END OF LOG ===" },
          ],
          encodedHint: "Destination is binary-encoded",
        },
        answer: "CUBA",
      },
      {
        title: "Fuel Purchase Receipt",
        objective: "A fuel receipt from the marina shows a suspicious purchase. The captain's name is Base64-encoded. Decode it to identify who fueled the yacht.",
        data: {
          type: "document",
          letterhead: "SUNSET MARINA - FUEL STATION",
          date: "March 15, 2024",
          reference: "Receipt #SM-2024-4892",
          body: [
            "VESSEL: Pacific Wave (Slip 47)",
            "FUEL TYPE: Marine Diesel",
            "QUANTITY: 2,500 gallons",
            "UNIT PRICE: $4.85/gal",
            "TOTAL: $12,125.00",
            "",
            "PAYMENT: Corporate Card ****7823",
            "AUTHORIZED BY: UklDSEFSRA==",
            "",
            "NOTE: Full tank - Long voyage preparation",
            "DEPARTURE LOGGED: Thursday 0600",
          ],
          encodedLine: { index: 7, hint: "Captain name is Base64-encoded" },
        },
        answer: "RICHARD",
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
        title: "Control Tower Log",
        objective: "The control tower recorded an unusual flight request. The pilot's callsign is hex-encoded. Decode it to identify the pilot.",
        data: {
          type: "log",
          header: "ATC TOWER - COMMUNICATION LOG",
          entries: [
            { timestamp: "05:30:00", level: "info", message: "N738VN: Request taxi clearance to runway 27" },
            { timestamp: "05:32:15", level: "info", message: "Tower: N738VN cleared to taxi via Alpha" },
            { timestamp: "05:45:22", level: "info", message: "N738VN: Ready for departure" },
            { timestamp: "05:46:08", level: "warn", message: "Tower: Confirm pilot identification" },
            { timestamp: "05:46:45", level: "info", message: "N738VN: Pilot callsign 48 41 57 4B", encoded: true },
            { timestamp: "05:47:30", level: "info", message: "Tower: Cleared for takeoff runway 27" },
            { timestamp: "05:48:12", level: "debug", message: "N738VN: Airborne. Switching to departure freq" },
          ],
          encodedHint: "Pilot callsign is hex-encoded",
        },
        answer: "HAWK",
      },
      {
        title: "Passenger Manifest Email",
        objective: "An email with the passenger manifest was intercepted. One passenger name is binary-encoded. Decode it to identify the VIP on board.",
        data: {
          type: "email",
          from: "dispatch@pacificaviation.com",
          to: "n738vn-captain@secure.ky",
          subject: "Flight N738VN - Passenger Manifest (CONFIDENTIAL)",
          date: "March 15, 2024 04:30",
          body: [
            "Captain,",
            "",
            "Attached is the passenger manifest for today's flight.",
            "",
            "PASSENGERS:",
            "1. Corporate Executive (Name withheld)",
            "2. 01010110 01000001 01001110 01000011 01000101",
            "",
            "Both passengers have diplomatic clearance.",
            "No customs inspection required at destination.",
            "",
            "Safe flight.",
          ],
          encodedLine: { index: 6, hint: "Passenger name is binary-encoded" },
          attachments: ["manifest_signed.pdf", "customs_waiver.pdf"],
        },
        answer: "VANCE",
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
