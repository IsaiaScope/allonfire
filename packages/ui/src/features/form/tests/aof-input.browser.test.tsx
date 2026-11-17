// @module-tag integration
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { AOFInput } from "../components/aof-input";

describe("AOFInput", () => {
  it("hydrates over an attribute a browser added to the input first", () => {
    // Chrome on iOS adds `__gcruniqueid` to inputs before React loads.
    const element = (
      <AOFInput aria-label="Search" readOnly type="search" value="" />
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    container.querySelector("input")?.setAttribute("__gcruniqueid", "1");
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const recoverable = vi.fn();
    act(() => {
      hydrateRoot(container, element, { onRecoverableError: recoverable });
    });
    expect(recoverable).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
