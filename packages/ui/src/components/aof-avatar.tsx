import { Avatar, AvatarFallback } from "@allonfire/shadcn/components/avatar";

// shadcn's avatar under AOF names, the fallback only: a picture is laid over
// it with AOFImage (next/image), which sizes and converts it, rather than
// Base UI's plain <img>. Add behaviour here, never in packages/shadcn.
export const AOFAvatar = Avatar;
export const AOFAvatarFallback = AvatarFallback;
