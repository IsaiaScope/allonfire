/** Images, under a host's version prefix in an API. */
const IMAGES = "/images";

/** Every path the storage package owns. */
export const STORAGE = {
  PATH: {
    IMAGES,
    /** The Images: `GET` lists them, `POST` uploads, `PATCH` edits, `DELETE` removes. */
    LIST: "/",
    /** One Image: `GET` reads it. */
    ONE: "/:id",
  },
} as const;
