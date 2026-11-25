import { pictureBodySchema } from "@allonfire/storage/features/image/constants/schemas";
import { z } from "zod";

/** A card's picture: what a board draws of an Image. */
export const deckImageSchema = pictureBodySchema;
export type DeckImage = z.infer<typeof deckImageSchema>;

/** The Images of one board, and how many a board needs. */
export const deckBodySchema = z
  .object({ images: z.array(deckImageSchema), needed: z.number().int() })
  .meta({ ref: "MemoryDeck" });
export type DeckBody = z.infer<typeof deckBodySchema>;

/**
 * A finished game. Plausibility is the handler's coded refusal, not zod's, so
 * a client can tell nonsense from a malformed body.
 */
export const scoreInputSchema = z
  .object({ moves: z.number().int(), timeMs: z.number().int() })
  .meta({ ref: "MemoryScoreInput" });

/** What a saved game earned. */
export const scoreBodySchema = z
  .object({
    id: z.string(),
    isGlobalBest: z.boolean(),
    isPersonalBest: z.boolean(),
    rank: z.number().int(),
  })
  .meta({ ref: "MemoryScore" });
export type ScoreBody = z.infer<typeof scoreBodySchema>;

/** The leaderboard, the caller's place and everyone's totals; each player's email under their name (Laura is private), no user id anywhere. */
export const leaderboardBodySchema = z
  .object({
    entries: z.array(
      z.object({
        email: z.string(),
        image: z.string().nullable(),
        imageBlurDataUrl: z.string().nullable(),
        isMe: z.boolean(),
        moves: z.number().int(),
        name: z.string().nullable(),
        playedAt: z.iso.datetime(),
        rank: z.number().int(),
        timeMs: z.number().int(),
      })
    ),
    me: z.object({
      averageMs: z.number().int().nullable(),
      bestMoves: z.number().int().nullable(),
      bestTimeMs: z.number().int().nullable(),
      rank: z.number().int().nullable(),
      totalGames: z.number().int(),
    }),
    stats: z.object({
      averageMs: z.number().int().nullable(),
      fastestMs: z.number().int().nullable(),
      fewestMoves: z.number().int().nullable(),
      totalGames: z.number().int(),
      uniquePlayers: z.number().int(),
    }),
  })
  .meta({ ref: "MemoryLeaderboard" });
export type LeaderboardBody = z.infer<typeof leaderboardBodySchema>;
