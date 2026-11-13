import type { CanManage } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type { imageStats } from "@allonfire/database/features/image/image-stats";
import type { z } from "zod";
import type { bucketKindSchema } from "../constants/schemas";
import type { AvatarAppStat } from "./avatar-usage";

type BucketKind = z.infer<typeof bucketKindSchema>;

/** One listing of a bucket, and when it was taken (an ISO time, as kept and as answered). */
export type BucketReading = { asOf: string; bytes: number; objects: number };

/** A bucket the API reads, listed or not. */
type BucketReport = {
  id: string;
  kind: BucketKind;
  reading: BucketReading | null;
};

/** What the Storage overview routes need of the stack; tests stub it. */
export type StorageUsageDeps = {
  /** The Avatars' bytes per App, read fresh; empty when the bucket cannot be listed. Never throws. */
  avatars: () => Promise<AvatarAppStat[]>;
  /** Every bucket listed, each from a copy kept a few minutes; one that cannot be listed has a null reading. Never throws. */
  buckets: () => Promise<readonly BucketReport[]>;
  canManage: CanManage;
  imageStats: typeof imageStats;
};
