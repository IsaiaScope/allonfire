// The commands the e2e preset runs (Playwright starts web servers before
// global setup, so the API's start command makes its bucket):
//   test-bucket create <label> <stamp>   drops the label's earlier runs, sweeps, creates, prints the name
//   test-bucket drop <label> <stamp>
//   test-bucket name <label> <stamp>     prints the name (the App's build)
import { testBucketName } from "./names";

const USAGE = "Usage: test-bucket <create|drop|name> <label> <stamp>";
const [command, label, stamp] = process.argv.slice(2);

if (!(label && stamp)) {
  throw new Error(USAGE);
}
if (command === "name") {
  process.stdout.write(testBucketName(label, stamp));
} else if (command === "create" || command === "drop") {
  // The S3 client validates STORAGE_* at import; `name` needs none of it.
  const { createTestBucket, dropTestBucket, dropTestBucketsOf } = await import(
    "./bucket"
  );
  if (command === "create") {
    await dropTestBucketsOf(label);
    process.stdout.write(await createTestBucket(label, stamp));
  } else {
    await dropTestBucket(label, stamp);
  }
} else {
  throw new Error(USAGE);
}
