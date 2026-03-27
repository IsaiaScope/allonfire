import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { s3 } from "./client";
import { env } from "./env";

let bucketVerified = false;

async function ensureBucket(): Promise<void> {
  if (bucketVerified) {
    return;
  }

  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.MINIO_BUCKET }));
  }

  bucketVerified = true;
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await ensureBucket();

  await s3.send(
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

export function getPublicUrl(key: string): string {
  return `${env.MINIO_ENDPOINT}/${env.MINIO_BUCKET}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    })
  );
}
