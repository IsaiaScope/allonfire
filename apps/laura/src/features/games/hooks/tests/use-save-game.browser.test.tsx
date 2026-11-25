// @module-tag integration

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderHook } from "vitest-browser-react";
import { submitMemoryScore } from "../../actions/submit-memory-score";
import { GAMES } from "../../constants/games";
import { useSaveGame } from "../use-save-game";

vi.mock("../../actions/submit-memory-score", () => ({
  submitMemoryScore: vi.fn(),
}));

const SCORE = { moves: 8, timeMs: 40_000 };
const SAVED = {
  id: "score-1",
  isGlobalBest: false,
  isPersonalBest: true,
  rank: 2,
};

const setup = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSaveGame(), { wrapper });
};

beforeEach(() => {
  vi.mocked(submitMemoryScore).mockReset();
});

describe("useSaveGame", () => {
  it("is idle until a game is saved, then saved with its rank", async () => {
    vi.mocked(submitMemoryScore).mockResolvedValue({ ok: true, score: SAVED });
    const { act, result } = await setup();
    expect(result.current.view).toEqual({ state: "idle" });
    expect(result.current.score).toBeUndefined();
    await act(() => result.current.save(SCORE));
    await vi.waitFor(() =>
      expect(result.current.view).toEqual({ score: SAVED, state: "saved" })
    );
    expect(result.current.score).toEqual(SCORE);
  });

  it("tries the same score again after a failure", async () => {
    vi.mocked(submitMemoryScore)
      .mockResolvedValueOnce({ ok: false, reason: GAMES.SUBMIT_ERROR.FAILED })
      .mockResolvedValueOnce({ ok: true, score: SAVED });
    const { act, result } = await setup();
    await act(() => result.current.save(SCORE));
    await vi.waitFor(() =>
      expect(result.current.view).toEqual({ state: "failed" })
    );
    await act(() => result.current.retry());
    await vi.waitFor(() =>
      expect(result.current.view).toEqual({ score: SAVED, state: "saved" })
    );
    expect(vi.mocked(submitMemoryScore)).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(submitMemoryScore).mock.calls.map(([sent]) => sent)
    ).toEqual([SCORE, SCORE]);
  });

  it("does nothing on retry before any game was saved", async () => {
    const { act, result } = await setup();
    await act(() => result.current.retry());
    expect(vi.mocked(submitMemoryScore)).not.toHaveBeenCalled();
  });
});
