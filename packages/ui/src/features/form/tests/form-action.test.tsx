// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { useAOFForm } from "../utils/form";
import { useAOFFormAction } from "../utils/form-submit";

/** React renders a function action as its own post target. */
const POSTS_TO_ACTION = /<form[^>]* action="/;
const action = (_formData: FormData) => undefined;

const ActionForm = () => {
  const form = useAOFForm({ defaultValues: { email: "" } });
  return <form aria-label="Email" {...useAOFFormAction(form, action)} />;
};

it("posts to the action before hydration, without the browser's own bubbles", () => {
  const html = renderToStaticMarkup(<ActionForm />);
  expect(html).toMatch(POSTS_TO_ACTION);
  expect(html).toContain('noValidate=""');
});
