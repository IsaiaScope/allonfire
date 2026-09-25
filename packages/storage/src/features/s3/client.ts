import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../environment/environment";

export const s3 = new S3Client({
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  endpoint: env.MINIO_ENDPOINT,
  forcePathStyle: true,
  region: "us-east-1",
});
