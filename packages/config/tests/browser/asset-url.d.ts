/**
 * Vite's `?url` import: a file's address, which a browser test fetches (an
 * Image Fixture through `@allonfire/storage/…/files/*`). A package with
 * browser tests lists this file in its tsconfig `types`.
 */
declare module "*?url" {
  const url: string;
  export default url;
}
