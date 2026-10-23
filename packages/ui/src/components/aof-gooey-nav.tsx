"use client";

import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { contrastInk, parseColor } from "../lib/gooey-nav/colors";
import { createGooeyEngine, type GooeyEngine } from "../lib/gooey-nav/engine";
import {
  GOOEY_NO_TINTS,
  GOOEY_PILLS,
  GOOEY_SIZES,
  GOOEY_THEMES,
  type GooeyPalette,
  type GooeySize,
} from "../lib/gooey-nav/looks";
import { optionCorner } from "../lib/gooey-nav/render";
import type { GooeySettings } from "../lib/gooey-nav/types";
import {
  listVariants,
  navVariants,
  optionVariants,
} from "../lib/gooey-nav/variants";
import { cn } from "../lib/utils";

// Forked from React Bits' Gooey Nav (packages/shadcn/src/components/GooeyNav.tsx,
// kept for diffing) into strict TypeScript, its engine in lib/gooey-nav. The fork
// changes the corners: the pill follows `radius` (WebGL and text clip), the frame
// is `rounded-lg`, options and fallback pill `rounded-md`. Until the engine draws
// (`data-ready`), the chosen option wears a CSS pill, so SSR shows the choice.

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export type AOFGooeyNavItem = {
  href?: string;
  icon?: ReactNode;
  label?: string;
};

export type AOFGooeyNavProps = {
  activeIndex?: number;
  /** The active label's colour; by default dark or white, whichever reads on the pill. */
  activeTextColor?: string;
  /** A drop's flight, in ms. */
  animationTime?: number;
  className?: string;
  /** The pill's colour, as hex or rgb(): WebGL paints it, so no CSS variable. */
  color?: string;
  /** The drops' colours, one picked at random per drop; the pill's by default. */
  colors?: string[];
  frame?: boolean;
  /** How far drops melt into each other, 0..1. */
  gooeyness?: number;
  hoverEffect?: boolean;
  initialActiveIndex?: number;
  items: AOFGooeyNavItem[];
  onChange?: (index: number, item: AOFGooeyNavItem) => void;
  particleCount?: number;
  /**
   * The pill's corner radius in CSS px. Left out, the corner the options
   * draw with in CSS (`rounded-md`, from the Design's `--radius`), read once
   * the page is styled.
   */
  radius?: number;
  size?: GooeySize;
  /** How far drops fly out, in px. */
  spread?: number;
  /** The nav's own style; its `--gn-*` variables override the theme's. */
  style?: CSSProperties & Partial<Record<`--gn-${string}`, string>>;
  theme?: GooeyPalette;
  /** How much each drop's flight time varies, in ms. */
  timeVariance?: number;
  /** How much the pill overshoots as it fills, 0..1. */
  wobble?: number;
};

/**
 * Set on the nav once the engine draws. Until then the active option wears
 * the pill as plain CSS, so the server's HTML shows the choice before any
 * script runs.
 */
const READY = "data-ready";

type GooeyOptionsProps = {
  current: number;
  /** False for the overlay's copy: plain spans, in the active text colour. */
  interactive: boolean;
  items: readonly AOFGooeyNavItem[];
  onSelect?: (index: number) => void;
};

/** The options as list items: links or buttons, or inert spans for the overlay. */
const GooeyOptions = ({
  current,
  interactive,
  items,
  onSelect,
}: GooeyOptionsProps) =>
  items.map((item, index) => {
    const key = `${index}:${item.label ?? ""}`;
    const content = (
      <>
        {item.icon ? (
          <span className="inline-flex flex-none [&_svg]:h-[1.15em] [&_svg]:w-[1.15em]">
            {item.icon}
          </span>
        ) : null}
        {item.label ? <span>{item.label}</span> : null}
      </>
    );
    if (!interactive) {
      return (
        <li className="flex" key={key}>
          <span className={optionVariants({ interactive })}>{content}</span>
        </li>
      );
    }
    const active = index === current;
    const shared = {
      "aria-current": active ? ("page" as const) : undefined,
      className: optionVariants({ interactive }),
      onClick: (event: MouseEvent) => {
        if (!item.href || item.href === "#") {
          event.preventDefault();
        }
        onSelect?.(index);
      },
    };
    return (
      <li
        className="group flex"
        data-active={active ? "" : undefined}
        data-gooey-index={index}
        key={key}
      >
        {item.href ? (
          <a href={item.href} {...shared}>
            {content}
          </a>
        ) : (
          <button type="button" {...shared}>
            {content}
          </button>
        )}
      </li>
    );
  });

/**
 * React Bits' Gooey Nav: the active pill melts into goo that flows to the
 * next option (WebGL; a plain pill without it, no flight for reduced motion),
 * the active label recoloured where the goo covers it.
 */
export const AOFGooeyNav = ({
  items,
  initialActiveIndex = 0,
  activeIndex,
  onChange,
  theme = "dark",
  color,
  activeTextColor,
  colors = GOOEY_NO_TINTS,
  size = "md",
  frame = true,
  animationTime = 600,
  particleCount = 15,
  timeVariance = 300,
  spread = 56,
  gooeyness = 0.5,
  wobble = 0.5,
  hoverEffect = true,
  radius,
  className,
  style,
}: AOFGooeyNavProps) => {
  const [innerIndex, setInnerIndex] = useState(initialActiveIndex);
  const current = Math.min(
    Math.max(0, activeIndex ?? innerIndex),
    Math.max(0, items.length - 1)
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overlayRef = useRef<HTMLUListElement>(null);
  const fallbackRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const engineRef = useRef<GooeyEngine | null>(null);
  // Fully round until the options' own corner is read, as upstream.
  const cssRadius = useRef(Number.POSITIVE_INFINITY);
  const corner = radius ?? cssRadius.current;
  const indexRef = useRef(current);
  indexRef.current = current;
  const palette = theme === "light" ? "light" : "dark";
  const pillColor = color || GOOEY_PILLS[palette].color;
  const pillRgb = parseColor(pillColor);
  const settings: GooeySettings = {
    animationTime,
    gooeyness,
    hoverEffect,
    hoverRgb: parseColor(GOOEY_PILLS[palette].hover),
    particleCount,
    pillRgb,
    radius: corner,
    shadow: GOOEY_PILLS[palette].shadow,
    spread,
    timeVariance,
    tints: colors.map(parseColor),
    wobble,
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  // The settings that change the drawing without moving any option.
  const look = [pillColor, palette, gooeyness, size, frame, corner].join(" ");

  const select = (index: number) => {
    const item = items[index];
    if (index === current || !item) {
      return;
    }
    if (activeIndex === undefined) {
      setInnerIndex(index);
    }
    onChange?.(index, item);
  };

  // Rebuilt when the options change in number: every rect is measured anew.
  useIsomorphicLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const list = listRef.current;
    const overlay = overlayRef.current;
    const fallback = fallbackRef.current;
    const nav = navRef.current;
    if (!(stage && canvas && list && overlay && fallback && nav)) {
      return;
    }
    if (radius === undefined) {
      cssRadius.current = optionCorner(list);
      settingsRef.current = {
        ...settingsRef.current,
        radius: cssRadius.current,
      };
    }
    const engine = createGooeyEngine(
      { canvas, fallback, list, overlay, stage },
      { index: () => indexRef.current, settings: () => settingsRef.current }
    );
    engineRef.current = engine;
    // The engine drew its first frame as it started, before this paint: the
    // CSS pill the server drew hands over to it in the same spot.
    nav.toggleAttribute(READY, true);
    return () => {
      engine.dispose();
      engineRef.current = null;
      nav.toggleAttribute(READY, false);
    };
  }, [items.length]);

  useEffect(() => {
    engineRef.current?.go(current);
  }, [current]);

  useEffect(() => {
    engineRef.current?.refresh(look);
  }, [look]);

  const textColor = activeTextColor || contrastInk(pillRgb);
  const variables = { "--gn-active-ink": textColor, "--gn-pill": pillColor };

  return (
    <nav
      className={cn(navVariants({ frame }), className)}
      ref={navRef}
      style={{
        ...GOOEY_SIZES[size],
        ...GOOEY_THEMES[palette],
        ...variables,
        ...style,
      }}
    >
      {frame ? (
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] [box-shadow:inset_0_0_0_1px_var(--gn-frame-edge),inset_0_1px_0_var(--gn-frame-highlight)]" />
      ) : null}
      <div className="relative max-w-full" ref={stageRef}>
        {/* A zero-size anchor at the stage's corner holds aria-hidden, which
            Biome refuses on the canvas itself. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0"
        >
          <canvas className="absolute top-0 left-0" ref={canvasRef} />
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 hidden rounded-md bg-(--gn-pill)"
          ref={fallbackRef}
        />
        <ul className={listVariants({ overlay: false })} ref={listRef}>
          <GooeyOptions
            current={current}
            interactive
            items={items}
            onSelect={select}
          />
        </ul>
        <ul
          aria-hidden="true"
          className={listVariants({ overlay: true })}
          ref={overlayRef}
        >
          <GooeyOptions current={current} interactive={false} items={items} />
        </ul>
      </div>
    </nav>
  );
};
