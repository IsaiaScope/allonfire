/** A PNG's width and height sit in its IHDR chunk, from byte 16. */
export const pngSize = async (response: Response) => {
  const view = new DataView(await response.arrayBuffer());
  return { height: view.getUint32(20), width: view.getUint32(16) };
};
