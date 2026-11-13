// @module-tag unit
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useAOFForm } from "../utils/form";

const EmailForm = ({
  clear,
  empty,
  hideLabel,
  icon,
  invalid,
  required,
  reveal,
  type = "email",
}: {
  clear?: string;
  empty?: boolean;
  hideLabel?: boolean;
  icon?: ReactNode;
  invalid?: boolean;
  required?: boolean;
  reveal?: string;
  type?: string;
}) => {
  const form = useAOFForm({
    defaultValues: { email: empty ? "" : "ada@example.com" },
  });
  return (
    <form.AppField name="email">
      {(field) => (
        <field.TextField
          autoComplete="username"
          clear={clear}
          hideLabel={hideLabel}
          icon={icon}
          id="email"
          invalid={invalid}
          label="Email"
          required={required}
          reveal={reveal}
          type={type}
        />
      )}
    </form.AppField>
  );
};

const ERROR_LINE = /<div class="min-h-6"><\/div>/;
const BUTTON = /<button[^>]*>/;
const BOLD_LABEL = /<label[^>]*class="[^"]*font-bold/;
const HIDDEN_LABEL = /<label[^>]*class="[^"]*sr-only[^"]*"[^>]*>Email<\/label>/;
const TALL_INPUT_WITH_ICON =
  /<input[^>]*class="[^"]*h-\(--field-height\)[^"]*pl-13/;
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

  it("offers a named clear button at its end while it holds text", () => {
    const html = renderToStaticMarkup(<EmailForm clear="Clear the email" />);
    expect(html.match(BUTTON)?.[0]).toContain('aria-label="Clear the email"');
    expect(html).toContain("pr-10");
  });

  it("draws no clear button when the field is empty, or without `clear`", () => {
    expect(
      renderToStaticMarkup(<EmailForm clear="Clear the email" empty />)
    ).not.toContain("<button");
    expect(renderToStaticMarkup(<EmailForm />)).not.toContain("<button");
  });

  // A field whose title is drawn by its host (a row with a button beside it)
  // still names its input, but takes no room above it.
  it("can hide its label from sight, which still names the input and takes no room", () => {
    const html = renderToStaticMarkup(<EmailForm hideLabel />);
    expect(html).toMatch(HIDDEN_LABEL);
    expect(html).toContain('for="email"');
  });

  it("draws every field tall, with a bold label and its icon on a dark tile", () => {
    const html = renderToStaticMarkup(<EmailForm icon={<svg data-icon />} />);
    expect(html).toMatch(TILE);
    expect(html).toMatch(BOLD_LABEL);
    expect(html).toMatch(TALL_INPUT_WITH_ICON);
  });
});

const REQUIRED_MARK =
  /<label[^>]*>Email<\/label><span aria-hidden="true" class="[^"]*text-destructive[^"]*">\*<\/span>/;

describe("AOFTextField when required", () => {
  it("marks its label with an asterisk, hidden from screen readers (the input says required)", () => {
    const html = renderToStaticMarkup(<EmailForm required />);
    expect(html).toMatch(REQUIRED_MARK);
    expect(html).toContain("required");
  });

  it("an optional field has no asterisk", () => {
    expect(renderToStaticMarkup(<EmailForm />)).not.toContain(">*<");
  });
});
