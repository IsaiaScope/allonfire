// @module-tag integration

import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { GateSubmit } from "../gate-submit";

const KANJI = "入";
const SEND = /Send/;
const SENDING = /Sending/;

const renderGate = (props: Partial<Parameters<typeof GateSubmit>[0]> = {}) =>
  render(
    <GateSubmit
      icon={<svg aria-hidden />}
      kanji={KANJI}
      pending={false}
      pendingLabel="Sending"
      {...props}
    >
      Send
    </GateSubmit>
  );

it("is a submit button saying its label", async () => {
  await renderGate();
  const button = page.getByRole("button", { name: SEND });
  await expect.element(button).toHaveAttribute("type", "submit");
});

it("says its pending label and is off while pending", async () => {
  await renderGate({ pending: true });
  const button = page.getByRole("button", { name: SENDING });
  await expect.element(button).toBeDisabled();
  await expect.element(button).toHaveAttribute("aria-busy", "true");
});

it("stays off for good when disabled", async () => {
  await renderGate({ disabled: true });
  await expect.element(page.getByRole("button", { name: SEND })).toBeDisabled();
});

it("hands any other button prop on, so a caller never needs a prop of its own for it", async () => {
  await renderGate({ id: "gate", title: "Enter" });
  const button = page.getByRole("button", { name: SEND });
  await expect.element(button).toHaveAttribute("id", "gate");
  await expect.element(button).toHaveAttribute("title", "Enter");
});

it("fills the row's width left over, unless a className says otherwise", async () => {
  await renderGate();
  await expect
    .element(page.getByRole("button", { name: SEND }))
    .toHaveClass("flex-1");
});

it("drops the row-filling width for the className it is given, which would squash it in a column", async () => {
  await renderGate({ className: "w-full" });
  const button = page.getByRole("button", { name: SEND });
  await expect.element(button).toHaveClass("w-full");
  await expect.element(button).not.toHaveClass("flex-1");
  // Its height stays the field's, whatever room the column has.
  const { height } = (await button.element()).getBoundingClientRect();
  expect(height).toBeGreaterThanOrEqual(36);
});
