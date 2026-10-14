// Player feedback (v7.7): the feedback page and the prompt after a first spell.
// Stored for admins to read; never shown to other players, so it is not moderated.
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireDb } from "./db";
import { p0Feedback, p0Users } from "../drizzle/schema";
import type { FeedbackKind } from "../shared/constants";

export async function saveFeedback(userId: number, input: { kind: FeedbackKind; rating?: number | null; message: string; source: string }): Promise<void> {
  await requireDb()
    .insert(p0Feedback)
    .values({ id: nanoid(), userId, kind: input.kind, rating: input.rating ?? null, message: input.message, source: input.source });
}

export async function recentFeedback(limit = 100) {
  const rows = await requireDb()
    .select({ feedback: p0Feedback, username: p0Users.username, email: p0Users.email })
    .from(p0Feedback)
    .leftJoin(p0Users, eq(p0Users.id, p0Feedback.userId))
    .orderBy(desc(p0Feedback.createdAt))
    .limit(Math.min(limit, 200));
  return rows.map((r) => ({ ...r.feedback, createdAt: r.feedback.createdAt.toISOString(), username: r.username, email: r.email }));
}

/** Whether the player has already given feedback (the first-spell prompt is then skipped). */
export async function hasGivenFeedback(userId: number): Promise<boolean> {
  const [row] = await requireDb().select({ id: p0Feedback.id }).from(p0Feedback).where(eq(p0Feedback.userId, userId)).limit(1);
  return !!row;
}
