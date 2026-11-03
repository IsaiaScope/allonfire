/**
 * The S3 client, its `send` recorded and answering `{}`, for a test that
 * mocks it: `vi.mock("../utils/client", () => import("./s3-client-mock"))`. The
 * real client validates STORAGE_* at import; these tests need no provider.
 */
export const send = vi.fn<(command: unknown) => Promise<unknown>>(() =>
  Promise.resolve({})
);

export const s3 = { send };
