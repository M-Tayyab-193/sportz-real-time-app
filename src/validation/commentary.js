import { z } from "zod";

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.number().int().nonnegative().optional(),
  sequence: z.number().int().nonnegative().optional(),
  period: z.string().min(1).optional(),
  eventType: z.string().min(1, "Event type is required"),
  actor: z.string().optional(),
  team: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});
