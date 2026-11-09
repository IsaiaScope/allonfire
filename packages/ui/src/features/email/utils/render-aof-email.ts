import { createElement } from "react";
import { render, toPlainText } from "react-email";
import { AOFEmail, type AOFEmailProps } from "../components/aof-email";

/**
 * Renders an email to HTML and its plain-text twin, which carries the action
 * link spelled out for clients that show no HTML. Server only.
 */
export const renderAOFEmail = async (
  props: AOFEmailProps
): Promise<{ html: string; text: string }> => {
  // One React render: `render`'s own `plainText` renders again, then converts.
  const html = await render(createElement(AOFEmail, props));
  return { html, text: toPlainText(html) };
};
