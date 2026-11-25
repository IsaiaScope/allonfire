import { z } from "zod";
import { IMAGE } from "./image";

const uploadErrorSchema = z.enum(IMAGE.UPLOAD.ERROR);
/** Why adding Images failed. */
export type UploadError = z.infer<typeof uploadErrorSchema>;

const uploadNoticeSchema = z.enum(IMAGE.UPLOAD.NOTICE);
/** What a saved add tells the form to do. */
export type UploadNotice = z.infer<typeof uploadNoticeSchema>;
