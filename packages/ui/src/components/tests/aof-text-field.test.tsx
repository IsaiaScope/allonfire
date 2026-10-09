// @module-tag unit
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useAOFForm } from "../../lib/form";

const EmailForm = ({
  icon,
  invalid,
  reveal,
  type = "email",
  variant,
}: {
  icon?: ReactNode;
  invalid?: boolean;
  reveal?: string;
  type?: string;
  variant?: "default" | "primary";
}) => {
  const form = useAOFForm({ defaultValues: { email: "ada@example.com" } });
  return (
    <form.AppField name="email">
      {(field) => (
        <field.TextField
          autoComplete="username"
          icon={icon}
          id="email"
          invalid={invalid}
          label="Email"
          reveal={reveal}
          type={type}
          variant={variant}
        />
      )}
    </form.AppField>
  );
};

const ERROR_LINE = /<div class="min-h-5"><\/div>/;
const BUTTON = /<button[^>]*>/;
const BOLD_LABEL = /<label[^>]*class="[^"]*font-bold/;
const TALL_INPUT_WITH_ICON = /<input[^>]*class="[^"]*h-12[^"]*pl-13/;
const TILE =
  /<span aria-hidden="true" class="[^"]*dark[^"]*bg-background[^"]*"><svg data-icon/;

describe("AOFTextField", () => {
  it("labels and names its input from the field", () => {
    const html = renderToStaticMarkup(<EmailForm />);
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('value="ada@example.com"');
    expect(html).toContain('autoComplete="username"');
  });

  it("marks the input and its field when the server reported an error", () => {
    const html = renderToStaticMarkup(<EmailForm invalid />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('data-invalid="true"');
  });

  it("keeps a line under the input for its error, so showing one moves nothing", () => {
    expect(renderToStaticMarkup(<EmailForm />)).toMatch(ERROR_LINE);
  });

  it("offers a named, unpressed eye button for a password it hides", () => {
    const html = renderToStaticMarkup(
      <EmailForm reveal="Show password" type="password" />
    );
    expect(html).toContain('type="password"');
    const button = html.match(BUTTON)?.[0] ?? "";
    expect(button).toContain('type="button"');
    expect(button).toContain('aria-controls="email"');
    expect(button).toContain('aria-label="Show password"');
    expect(button).toContain('aria-pressed="false"');
  });

  it("draws no eye button without `reveal`", () => {
    expect(renderToStaticMarkup(<EmailForm type="password" />)).not.toContain(
      "aria-pressed"
    );
  });

  it("wraps its one input in no unnamed group", () => {
    expect(renderToStaticMarkup(<EmailForm />)).not.toContain('role="group"');
  });

  it("draws the primary variant tall, with a bold label and its icon on a dark tile", () => {
    const html = renderToStaticMarkup(
      <EmailForm icon={<svg data-icon />} variant="primary" />
    );
    expect(html).toMatch(TILE);
    expect(html).toMatch(BOLD_LABEL);
    expect(html).toMatch(TALL_INPUT_WITH_ICON);
  });

  it("draws the default variant at shadcn's size", () => {
    const html = renderToStaticMarkup(<EmailForm />);
    expect(html).not.toContain("h-12");
    expect(html).not.toContain("font-bold");
  });
});
