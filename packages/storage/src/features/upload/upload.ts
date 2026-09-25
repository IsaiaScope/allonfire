import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "../../environment/environment";
import { s3 } from "../s3/client";

let bucketPromise: Promise<void> | null = null;

function ensureBucket(): Promise<void> {
  if (!bucketPromise) {
    bucketPromise = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
      } catch {
        await s3.send(new CreateBucketCommand({ Bucket: env.MINIO_BUCKET }));
      }
    })();
  }
  return bucketPromise;
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await ensureBucket();

  await s3.send(
    new PutObjectCommand({
      Body: body,
      Bucket: env.MINIO_BUCKET,
      ContentType: contentType,
      Key: key,
    })
  );

  return getPublicUrl(key);
}

export function getPublicUrl(key: string): string {
  return `/storage/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    })
  );
}
