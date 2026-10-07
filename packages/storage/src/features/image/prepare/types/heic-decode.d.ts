// heic-decode ships no types; only the call prepare-image makes.
declare module "heic-decode" {
  type DecodedImage = {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  };
  const decode: (input: { buffer: Uint8Array }) => Promise<DecodedImage>;
  export default decode;
}
