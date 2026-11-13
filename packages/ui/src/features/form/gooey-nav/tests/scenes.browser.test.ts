// @module-tag integration

import { drawScene, MARGIN } from "../utils/pipeline";
import { followContext, startScene } from "../utils/render";
import type { GooeySettings } from "../utils/types";

/** One toggle's canvas and its CSS pill, as the component renders them. */
const toggle = () => ({
  canvas: document.createElement("canvas"),
  fallback: document.createElement("span"),
});

/** A form of twenty pictures holds well over Chrome's 16 WebGL contexts' worth of toggles. */
const TOGGLES = 60;
const STAGE = { height: 40, width: 100 };
const SETTINGS: GooeySettings = {
  animationTime: 1,
  gooeyness: 0.5,
  hoverEffect: false,
  hoverRgb: [0, 0, 0, 0],
  particleCount: 0,
  pillRgb: [1, 0, 0, 1],
  radius: 8,
  shadow: 0,
  spread: 0,
  timeVariance: 0,
  tints: [],
  wobble: 0,
};

const start = (nodes = toggle()) => ({ ...nodes, scene: startScene(nodes) });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("startScene", () => {
  it("draws every toggle with WebGL, from one context between them", () => {
    const ask = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
    const started = Array.from({ length: TOGGLES }, () => start());
    for (const { canvas, fallback, scene } of started) {
      expect(scene).not.toBeNull();
      expect(canvas.style.display).toBe("block");
      expect(fallback.style.display).toBe("none");
    }
    const webgl = ask.mock.calls.filter(([kind]) => kind === "webgl2");
    expect(webgl.length).toBeLessThanOrEqual(1);
  });

  it("paints a toggle's own canvas, however many others draw", () => {
    const toggles = Array.from({ length: TOGGLES }, () => start());
    const last = toggles.at(-1);
    expect(last?.scene).not.toBeNull();
    if (!last?.scene) {
      return;
    }
    const ratio = 1;
    last.canvas.width = (STAGE.width + MARGIN * 2) * ratio;
    last.canvas.height = (STAGE.height + MARGIN * 2) * ratio;
    drawScene(last.scene, {
      blobs: [],
      boxes: [{ cx: STAGE.width / 2, cy: STAGE.height / 2, hh: 14, hw: 40 }],
      hover: { alpha: 0, h: 0, index: -1, w: 0, x: 0, y: 0 },
      settings: SETTINGS,
      smooth: 4,
      view: STAGE,
    });
    const pixel = last.canvas
      .getContext("2d")
      ?.getImageData(last.canvas.width / 2, last.canvas.height / 2, 1, 1).data;
    expect(pixel?.[3]).toBeGreaterThan(0);
  });

  it("starts again on the same canvas, as React's second effect run does", () => {
    const nodes = toggle();
    expect(start(nodes).scene).not.toBeNull();
    expect(start(nodes).scene).not.toBeNull();
  });

  it("tells the toggles when the shared context is lost, and when it is back", async () => {
    const { scene } = start();
    const loser = scene?.shared.gl.getExtension("WEBGL_lose_context");
    expect(loser).toBeTruthy();
    const lost = vi.fn();
    const back = new Promise<void>((resolve) => {
      const stop = followContext({
        lost,
        restored: () => {
          stop();
          resolve();
        },
      });
    });
    loser?.loseContext();
    await vi.waitFor(() => expect(lost).toHaveBeenCalledTimes(1));
    // Nothing draws through a lost context: the CSS pill stands in.
    const during = start();
    expect(during.scene).toBeNull();
    expect(during.fallback.style.display).toBe("block");
    loser?.restoreContext();
    await back;
    expect(start().scene).not.toBeNull();
  });
});
