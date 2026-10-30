import { type CSSProperties, type ReactNode } from 'react';
type Palette = 'dark' | 'light';
type Size = 'sm' | 'md' | 'lg';
export interface GooeyNavItem {
    label?: string;
    href?: string;
    icon?: ReactNode;
}
interface GooeyNavProps {
    items?: GooeyNavItem[];
    initialActiveIndex?: number;
    activeIndex?: number;
    onChange?: (index: number, item: GooeyNavItem) => void;
    theme?: Palette;
    color?: string;
    activeTextColor?: string;
    colors?: string[];
    size?: Size;
    frame?: boolean;
    animationTime?: number;
    particleCount?: number;
    timeVariance?: number;
    spread?: number;
    gooeyness?: number;
    wobble?: number;
    hoverEffect?: boolean;
    className?: string;
    style?: CSSProperties;
}
declare const GooeyNav: ({ items, initialActiveIndex, activeIndex, onChange, theme, color, activeTextColor, colors, size, frame, animationTime, particleCount, timeVariance, spread, gooeyness, wobble, hoverEffect, className, style }: GooeyNavProps) => import("react").JSX.Element;
export default GooeyNav;
