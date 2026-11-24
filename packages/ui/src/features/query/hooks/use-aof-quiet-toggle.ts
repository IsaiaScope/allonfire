"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * How long a burst of taps waits after the last one before it is committed.
 * @internal Read by the tests of the screens that use the hook.
 */
export const QUIET_MS = 400;

type Options = {
  /** Writes the state; calls `onSettled` once it ended, saved or refused. */
  commit: (next: boolean, options: { onSettled: () => void }) => void;
  /** The state the screen's own data holds (the cache, already patched by a commit). */
  confirmed: boolean;
};

/**
 * A two-state control (a heart, a switch) whose taps show at once and are
 * written once they stop: every write and the reads after it count against
 * the API's limit, so a burst is one write (the last state), and none when it
 * ends on what is already held. It owns the rules both controls need:
 * `shown` is the last tap until the commit settles (a refusal included), then
 * the confirmed state again; a state asked for while another is being
 * committed is compared with that one, so going back is a change; the latest
 * `commit` and `confirmed` are read when the quiet ends. A pending commit still
 * runs when the control leaves. A control that stands for one thing at a time
 * (the heart in a preview) is keyed by it, so a tap never follows the screen
 * to another.
 */
export const useAOFQuietToggle = ({ commit, confirmed }: Options) => {
  const [wanted, setWanted] = useState<boolean | undefined>(undefined);
  const latest = useRef({ commit, confirmed });
  const inFlight = useRef<boolean | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    latest.current = { commit, confirmed };
  }, [commit, confirmed]);
  const set = useCallback((next: boolean) => {
    setWanted(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { commit: run, confirmed: held } = latest.current;
      if (next === (inFlight.current ?? held)) {
        setWanted(undefined);
        return;
      }
      inFlight.current = next;
      run(next, {
        onSettled: () => {
          inFlight.current = undefined;
          setWanted((now) => (now === next ? undefined : now));
        },
      });
    }, QUIET_MS);
  }, []);
  return { set, shown: wanted ?? confirmed };
};
