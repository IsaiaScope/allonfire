/** The bytes every JPEG file starts with. */
export const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

/** As many of a file's first bytes as the signature has. */
export const signatureOf = (file: Uint8Array): number[] => [
  ...file.subarray(0, JPEG_SIGNATURE.length),
];
