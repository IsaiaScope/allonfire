// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { useAOFForm } from "../utils/form";

const ZONES = [
  { label: "(GMT+0) UTC", value: "UTC" },
  { label: "(GMT+1) Europe/Rome", value: "Europe/Rome" },
] as const;
/** The hidden input posting the chosen zone's value. */
const HIDDEN_ROME =
  /name="zone"[^>]*value="Europe\/Rome"|value="Europe\/Rome"[^>]*name="zone"/;

const ZoneForm = ({ zone }: { zone: string }) => {
  const form = useAOFForm({ defaultValues: { zone } });
  return (
    <form.AppField name="zone">
      {(field) => (
        <field.ComboboxField
          empty="No zone"
          label="Time zone"
          options={ZONES}
        />
      )}
    </form.AppField>
  );
};

describe("AOFComboboxField", () => {
  it("shows the chosen option and posts its value under the field's name", () => {
    const html = renderToStaticMarkup(<ZoneForm zone="Europe/Rome" />);
    expect(html).toContain("Time zone");
    expect(html).toContain('value="(GMT+1) Europe/Rome"');
    expect(html).toMatch(HIDDEN_ROME);
  });

  it("starts empty when the field holds no option", () => {
    const html = renderToStaticMarkup(<ZoneForm zone="" />);
    expect(html).not.toContain('Europe/Rome"');
  });
});
