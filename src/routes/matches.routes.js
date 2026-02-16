import express from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "#validation/matches.js";
import { db } from "#db/db.ts";
import { getMatchStatus } from "#utils/match-status.js";
import { matches } from "#db/schema.ts";
import { desc } from "drizzle-orm";
const matchRouter = express.Router();

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      error: parsed.error.issues,
    });
  }
  const limit = Math.min(parsed.data.limit ?? 50, 100);
  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    res.json({ data });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch matches",
      error: error.message,
    });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      error: parsed.error.issues,
    });
  }
  const { data: { startTime, endTime, homeScore, awayScore } = {} } = parsed;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore || 0,
        awayScore: awayScore || 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();
    res
      .status(201)
      .json({ message: "Match created successfully", data: event });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create a match",
      error: error.message,
    });
  }
});

export default matchRouter;
