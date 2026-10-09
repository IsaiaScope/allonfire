import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../environment/environment";

export const s3 = new S3Client({
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
  },
  endpoint: env.STORAGE_ENDPOINT,
  forcePathStyle: true,
  region: "us-east-1",
});
