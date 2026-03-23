type SuccessResult<T> = T extends void
  ? { success: true }
  : { success: true; data: T };

export type ActionResult<T = void> =
  | SuccessResult<T>
  | { success: false; error: string };
