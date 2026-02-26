import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup every minute to remove inactive players and empty rooms
crons.interval(
  "cleanup inactive players",
  { minutes: 1 },
  internal.rooms.cleanupInactivePlayers
);

export default crons;
