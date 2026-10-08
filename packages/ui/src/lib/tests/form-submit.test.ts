// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { submitAOFForm } from "../form-submit";

/** Lets the submit's promise settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

const formWith = (names: string[]) => {
  const focused: string[] = [];
  const element = {
    elements: {
      namedItem: (name: string) =>
        names.includes(name) ? { focus: () => focused.push(name) } : null,
    },
  };
  return { element, focused };
};

const formThat = (
  outcome: Promise<unknown>,
  fieldMeta: Record<string, { errors: unknown[] }>
) => ({
  handleSubmit: vi.fn(() => outcome),
  state: {
    fieldMeta,
    isValid: objectValues(fieldMeta).every(({ errors }) => !errors.length),
  },
});

const submit = (
  form: ReturnType<typeof formThat>,
  element: ReturnType<typeof formWith>["element"]
) => {
  const preventDefault = vi.fn();
  const send = vi.fn();
  submitAOFForm(form, { currentTarget: element, preventDefault }, send);
  return { preventDefault, send };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("submitAOFForm", () => {
  it("stops the browser's post and sends the form when its checks pass", async () => {
    const { element, focused } = formWith(["email"]);
    const form = formThat(Promise.resolve(), { email: { errors: [] } });
    const { preventDefault, send } = submit(form, element);
    await settle();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(form.handleSubmit).toHaveBeenCalledWith();
    expect(send).toHaveBeenCalledExactlyOnceWith(element);
    expect(focused).toEqual([]);
  });

  it("focuses the first field, in order, that has errors, and sends nothing", async () => {
    const { element, focused } = formWith(["email", "password"]);
    const { send } = submit(
      formThat(Promise.resolve(), {
        email: { errors: [] },
        password: { errors: ["Enter your password."] },
      }),
      element
    );
    await settle();
    expect(focused).toEqual(["password"]);
    expect(send).not.toHaveBeenCalled();
  });

  it("skips a field with errors but no element to focus", async () => {
    const { element, focused } = formWith(["password"]);
    submit(
      formThat(Promise.resolve(), {
        email: { errors: ["Required."] },
        password: { errors: ["Required."] },
      }),
      element
    );
    await settle();
    expect(focused).toEqual(["password"]);
  });

  it("reports an error a validator throws instead of swallowing it", async () => {
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    const failure = new Error("schema bug");
    const { send } = submit(
      formThat(Promise.reject(failure), { email: { errors: [] } }),
      formWith(["email"]).element
    );
    await settle();
    expect(reportError).toHaveBeenCalledWith(failure);
    expect(send).not.toHaveBeenCalled();
  });
});
