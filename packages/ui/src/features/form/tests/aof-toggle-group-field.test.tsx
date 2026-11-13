// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { useAOFForm } from "../utils/form";

const APPS = [
  { label: "Back Office", value: "BACK_OFFICE" },
  { label: "Laura", value: "LAURA" },
] as const;
/** A hidden input posting one chosen value under the field's name. */
const posts = (html: string, value: string) =>
  new RegExp(
    `type="hidden"[^>]*name="apps"[^>]*value="${value}"|type="hidden"[^>]*value="${value}"[^>]*name="apps"`
  ).test(html);

const AppsForm = ({ apps }: { apps: string[] | undefined }) => {
  const form = useAOFForm({ defaultValues: { apps } });
  return (
    <form.AppField name="apps">
      {(field) => (
        <field.ToggleGroupField
          ink="#000000"
          label="Apps"
          off={{ icon: <i />, label: "Not in" }}
          on={{ icon: <i />, label: "In" }}
          options={APPS}
          pill="#ffffff"
          required
        />
      )}
    </form.AppField>
  );
};

describe("AOFToggleGroupField", () => {
  it("names the group and gives each option its own on and off toggle", () => {
    const html = renderToStaticMarkup(<AppsForm apps={[]} />);
    expect(html).toContain("Apps");
    expect(html).toContain('aria-label="Back Office"');
    expect(html).toContain('aria-label="Laura"');
    expect(html.match(/role="radiogroup"/g)).toHaveLength(APPS.length);
  });

  it("posts each chosen value under the field's name, and no other", () => {
    const html = renderToStaticMarkup(<AppsForm apps={["LAURA"]} />);
    expect(posts(html, "LAURA")).toBe(true);
    expect(posts(html, "BACK_OFFICE")).toBe(false);
  });

  it("posts nothing when none is chosen", () => {
    expect(posts(renderToStaticMarkup(<AppsForm apps={[]} />), "LAURA")).toBe(
      false
    );
  });

  it("reads a field whose value is gone (a removed row) as none chosen", () => {
    const html = renderToStaticMarkup(<AppsForm apps={undefined} />);
    expect(html).toContain("Back Office");
    expect(posts(html, "LAURA")).toBe(false);
  });
});
