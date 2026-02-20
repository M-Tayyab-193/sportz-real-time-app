import express from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "#db/db.ts";
import { commentary } from "#db/schema.ts";
import { matchIdParamSchema } from "#validation/matches.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "#validation/commentary.js";

const MAX_LIMIT = 100;

const commentaryRouter = express.Router({ mergeParams: true });

commentaryRouter.get("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      message: "Invalid match ID",
      error: parsedParams.error.issues,
    });
  }

  const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      error: parsedQuery.error.issues,
    });
  }

  const { id: matchId } = parsedParams.data;
  const limit = Math.min(parsedQuery.data.limit ?? MAX_LIMIT, MAX_LIMIT);

  try {
    const entries = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({
      message: "Commentary fetched successfully",
      data: entries,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch commentary",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const parsedParams = matchIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      message: "Invalid match ID",
      error: parsedParams.error.issues,
    });
  }

  const parsedBody = createCommentarySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      message: "Invalid request body",
      error: parsedBody.error.issues,
    });
  }

  const { id: matchId } = parsedParams.data;

  try {
    const [entry] = await db
      .insert(commentary)
      .values({
        matchId,
        ...parsedBody.data,
      })
      .returning();

    return res.status(201).json({
      message: "Commentary created successfully",
      data: entry,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create commentary",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default commentaryRouter;
