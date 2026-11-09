/** Two animation frames: Sonner sends a toast, or its dismissal, a frame
 *  late. */
export const nextFrames = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );

/** Long enough for a toast to arrive: a frame late, then Sonner's own timer. */
const TOAST_ARRIVES_MS = 200;

/** Waits until a toast would have arrived, so its absence means something. */
export const toastWouldHaveArrived = async () => {
  await nextFrames();
  await new Promise((resolve) => setTimeout(resolve, TOAST_ARRIVES_MS));
};
