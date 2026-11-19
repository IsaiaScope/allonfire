// @module-tag integration

import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@allonfire/shadcn/components/combobox";
import { server } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFFaceted } from "../../features/data-table/components/aof-faceted";
import { AOFComboboxContent } from "../../features/form/components/aof-combobox-content";
import {
  AOFDropdownMenu,
  AOFDropdownMenuContent,
  AOFDropdownMenuItem,
  AOFDropdownMenuTrigger,
} from "../components/aof-dropdown-menu";
import {
  AOFPopover,
  AOFPopoverContent,
  AOFPopoverTrigger,
} from "../components/aof-popover";
import {
  AOFSelect,
  AOFSelectContent,
  AOFSelectItem,
  AOFSelectTrigger,
  AOFSelectValue,
} from "../components/aof-select";
import {
  clearSafeAreaInsets,
  notchedPhone,
  setSafeAreaInsets,
} from "./emulated-media";

/** A phone turned sideways: the sensor housing's width on both sides, the
 *  home indicator below, nothing above. */
const NOTCH = { bottom: 21, left: 59, right: 59, top: 0 } as const;

/** Where a trigger sits: as close to the corner as the safe edges let it
 *  (every control keeps inside them), so a popup wider than the room beside
 *  it has to shift against the edge. */
const CORNER = {
  left: { bottom: NOTCH.bottom, left: NOTCH.left, position: "fixed" },
  right: { bottom: NOTCH.bottom, position: "fixed", right: NOTCH.right },
} as const;

/** Well above the bottom edge: Base UI opens a list over such a trigger and
 *  runs it down to the screen's last 10px, past the home indicator. */
const ABOVE_BOTTOM = { ...CORNER.left, bottom: 120 } as const;

/** More rows than a phone turned sideways shows: the list reaches the screen's edges. */
const nothing = () => undefined;

/** A trigger below the top and well clear of the bottom: its list runs down to the screen's edge. */
const MIDDLE = { left: NOTCH.left, position: "fixed", top: 150 } as const;

/** The same with a status bar above: the top inset, which a phone turned sideways has none of. */
const WITH_STATUS_BAR = { ...NOTCH, top: 47 } as const;

/** A field as wide as the safe area, as a form's fields are on a phone, too
 *  low for its list to open below it: the list opens upwards, to the status bar. */
const LOW_FIELD = {
  left: NOTCH.left,
  position: "fixed",
  right: NOTCH.right,
  top: 300,
} as const;

/** The same, at the right edge. */
const MIDDLE_END = { position: "fixed", right: NOTCH.right, top: 150 } as const;

const ITEMS = Array.from({ length: 30 }, (_, index) => `item ${index + 1}`);

/** The sides of `popup`'s box past the screen's safe edges (`insets`). */
const pastSafeEdges = (
  popup: Element,
  insets: Record<"bottom" | "left" | "right" | "top", number> = NOTCH
) => {
  const box = popup.getBoundingClientRect();
  return [
    box.top < insets.top && "top",
    box.left < insets.left && "left",
    box.right > window.innerWidth - insets.right && "right",
    box.bottom > window.innerHeight - insets.bottom && "bottom",
  ].filter(Boolean);
};

// WebKit has no way to draw a notch.
describe.runIf(server.browser === "chromium")(
  "Popups on a notched screen",
  () => {
    beforeEach(() => notchedPhone(NOTCH));
    afterEach(clearSafeAreaInsets);

    // Centred on a trigger that is narrower than it, and so reaching past the
    // trigger's side: Base UI flips a start or end alignment away from the
    // edge, but a centred popup can only be shifted, by the padding.
    it("keeps a menu centred on a trigger at the edge clear of the notch", async () => {
      const screen = await render(
        <AOFDropdownMenu open>
          <AOFDropdownMenuTrigger
            render={<button style={MIDDLE} type="button" />}
          >
            Account
          </AOFDropdownMenuTrigger>
          <AOFDropdownMenuContent align="center">
            {ITEMS.map((item) => (
              <AOFDropdownMenuItem key={item}>{item}</AOFDropdownMenuItem>
            ))}
          </AOFDropdownMenuContent>
        </AOFDropdownMenu>
      );
      await expect.element(screen.getByRole("menu")).toBeVisible();
      await expect
        .poll(() => pastSafeEdges(screen.getByRole("menu").element()))
        .toEqual([]);
    });

    it("keeps a select list opened in a corner clear of the notch", async () => {
      const screen = await render(
        <AOFSelect value="item 1">
          <AOFSelectTrigger aria-label="Pick" style={ABOVE_BOTTOM}>
            <AOFSelectValue />
          </AOFSelectTrigger>
          <AOFSelectContent>
            {ITEMS.map((item) => (
              <AOFSelectItem key={item} value={item}>
                {item}
              </AOFSelectItem>
            ))}
          </AOFSelectContent>
        </AOFSelect>
      );
      // Opened by a person, after the page has measured its insets.
      await screen.getByRole("combobox").click();
      await expect.element(screen.getByRole("listbox")).toBeVisible();
      await expect
        .poll(() =>
          pastSafeEdges(
            // The list inside scrolls: the box that must fit is the popup's.
            screen.getByRole("listbox").element().closest("[data-slot]") ??
              document.body
          )
        )
        .toEqual([]);
    });

    it("keeps a tall popover centred on a trigger at the edge clear of the notch", async () => {
      const screen = await render(
        <AOFPopover open>
          <AOFPopoverTrigger
            render={<button style={MIDDLE_END} type="button" />}
          >
            Filters
          </AOFPopoverTrigger>
          <AOFPopoverContent align="center">
            <div style={{ height: 900 }}>Filters</div>
          </AOFPopoverContent>
        </AOFPopover>
      );
      await expect.element(screen.getByRole("dialog")).toBeVisible();
      await expect
        .poll(() => pastSafeEdges(screen.getByRole("dialog").element()))
        .toEqual([]);
    });

    // shadcn reserves 36px under the list for an input a popup can hold; this
    // one's input is outside it, so only the status bar's 47px can be seen.
    it("keeps the list of a low field clear of the status bar", async () => {
      await setSafeAreaInsets(WITH_STATUS_BAR);
      const screen = await render(
        <Combobox items={ITEMS}>
          <div style={LOW_FIELD}>
            <ComboboxInput aria-label="Zone" />
          </div>
          <AOFComboboxContent>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </AOFComboboxContent>
        </Combobox>
      );
      await screen.getByRole("combobox").click();
      await expect.element(screen.getByRole("listbox")).toBeVisible();
      const popup =
        document.querySelector('[data-slot="combobox-content"]') ??
        document.body;
      // Zooming in, the popup is smaller than it ends up: measure it settled.
      await Promise.all(popup.getAnimations().map((a) => a.finished));
      expect(pastSafeEdges(popup, WITH_STATUS_BAR)).toEqual([]);
    });

    it("keeps a faceted list clear of the notch", async () => {
      const screen = await render(
        <AOFFaceted
          items={ITEMS.map((item) => ({ label: item, value: item }))}
          labels={{
            add: "Add",
            clear: "Clear the text",
            empty: "No match",
            reset: "Clear",
            search: "Search",
            selected: (count) => `${count} selected`,
            trigger: "Role",
          }}
          onValueChange={nothing}
          triggerProps={{ style: MIDDLE }}
          value={[]}
        />
      );
      await screen.getByRole("button", { name: "Role" }).click();
      await expect
        .poll(() =>
          pastSafeEdges(
            document.querySelector('[data-slot="faceted-content"]') ??
              document.body
          )
        )
        .toEqual([]);
    });
  }
);
