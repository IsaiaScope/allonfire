// @module-tag integration
import { NextIntlClientProvider } from "next-intl";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { enT, itT } from "@/shared/tests/translators";
import EN from "../../../features/i18n/translations/en.json" with {
  type: "json",
};
import IT from "../../../features/i18n/translations/it.json" with {
  type: "json",
};
import { ListSortPanel, ListViewPanel } from "../list-panels";

const COLUMNS = [
  { id: "created", label: "Created" },
  { id: "size", label: "Size" },
];

describe("ListSortPanel and ListViewPanel", () => {
  it("speak English with the Back Office's words", async () => {
    const onSortingChange = vi.fn();
    await render(
      <NextIntlClientProvider locale="en" messages={EN}>
        <ListSortPanel
          columns={COLUMNS}
          onSortingChange={onSortingChange}
          sorting={[]}
        />
        <ListViewPanel
          columns={COLUMNS}
          hidden={["size"]}
          onHiddenChange={vi.fn()}
          searchIcon={null}
        />
      </NextIntlClientProvider>
    );
    await userEvent.click(
      page.getByRole("button", { name: enT("List.sort.add") })
    );
    expect(onSortingChange).toHaveBeenCalledWith([
      { desc: false, id: "created" },
    ]);
    await expect
      .element(page.getByRole("option", { name: "Size" }))
      .toHaveAttribute("data-checked", "false");
    await expect
      .element(page.getByPlaceholder(enT("List.view.search")))
      .toBeVisible();
  });

  it("speak Italian too", async () => {
    await render(
      <NextIntlClientProvider locale="it" messages={IT}>
        <ListSortPanel
          columns={COLUMNS}
          onSortingChange={vi.fn()}
          sorting={[]}
        />
      </NextIntlClientProvider>
    );
    await expect
      .element(page.getByRole("button", { name: itT("List.sort.add") }))
      .toBeVisible();
  });
});
