import { guard } from "../utils/guard";

/** 401 when anonymous; any signed-in User passes. */
export const requireSession = () => guard(() => true);
