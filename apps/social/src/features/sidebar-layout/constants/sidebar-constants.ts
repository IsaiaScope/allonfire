export const COOKIE_NAME = "sidebar_state";
export const MIN_WIDTH = 230;
export const MAX_WIDTH = 320;
export const DEFAULT_WIDTH = 230;
export const COLLAPSED_WIDTH = 60;

export type SidebarState = {
  isCollapsed: boolean;
  width: number;
};

const defaultState: SidebarState = { isCollapsed: false, width: DEFAULT_WIDTH };

export function parseCookieState(
  cookieValue: string | undefined
): SidebarState {
  if (!cookieValue) {
    return defaultState;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    return {
      isCollapsed: Boolean(parsed.isCollapsed),
      width: Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, Number(parsed.width) || DEFAULT_WIDTH)
      ),
    };
  } catch {
    return defaultState;
  }
}
