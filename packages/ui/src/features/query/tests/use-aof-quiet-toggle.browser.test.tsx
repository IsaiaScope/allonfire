// @module-tag integration
import { useCallback } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QUIET_MS, useAOFQuietToggle } from "../hooks/use-aof-quiet-toggle";

type Commit = (next: boolean, options: { onSettled: () => void }) => void;
const commit = vi.fn<Commit>();

const Toggle = ({
  confirmed,
  onCommit,
}: {
  confirmed: boolean;
  onCommit: Commit;
}) => {
  const { set, shown } = useAOFQuietToggle({ commit: onCommit, confirmed });
  const flip = useCallback(() => set(!shown), [set, shown]);
  return (
    <button aria-pressed={shown} onClick={flip} type="button">
      toggle
    </button>
  );
};

const toggle = () => page.getByRole("button", { name: "toggle" });

beforeEach(() => {
  commit.mockReset();
  // Only the hook's timer is fake: the clicks and the render stay real.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => vi.useRealTimers());

describe("useAOFQuietToggle", () => {
  it("shows a tap at once and commits the last state once the taps stop", async () => {
    await render(<Toggle confirmed={false} onCommit={commit} />);
    await toggle().click();
    await expect.element(toggle()).toHaveAttribute("aria-pressed", "true");
    await toggle().click();
    await toggle().click();
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(QUIET_MS);
    expect(commit.mock.calls.map(([next]) => next)).toEqual([true]);
  });

  it("commits nothing when the burst ends on the confirmed state", async () => {
    await render(<Toggle confirmed={false} onCommit={commit} />);
    await toggle().click();
    await toggle().click();
    vi.advanceTimersByTime(QUIET_MS);
    expect(commit).not.toHaveBeenCalled();
    await expect.element(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("commits a state asked for while another is being committed, after asking again", async () => {
    await render(<Toggle confirmed={false} onCommit={commit} />);
    await toggle().click();
    vi.advanceTimersByTime(QUIET_MS);
    // The first is still on its way (never settled): going back is a change.
    await toggle().click();
    vi.advanceTimersByTime(QUIET_MS);
    expect(commit.mock.calls.map(([next]) => next)).toEqual([true, false]);
  });

  it("goes back to the confirmed state once a commit settles, a refused one included", async () => {
    await render(<Toggle confirmed={false} onCommit={commit} />);
    await toggle().click();
    vi.advanceTimersByTime(QUIET_MS);
    await expect.element(toggle()).toHaveAttribute("aria-pressed", "true");
    commit.mock.calls[0]?.[1].onSettled();
    await expect.element(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("commits with the latest function it was given", async () => {
    const later = vi.fn<Commit>();
    const screen = await render(<Toggle confirmed={false} onCommit={commit} />);
    await toggle().click();
    await screen.rerender(<Toggle confirmed={false} onCommit={later} />);
    vi.advanceTimersByTime(QUIET_MS);
    expect(later).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });
});
