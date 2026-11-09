// @module-tag unit
import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { AOF_EMAIL_LOOK } from "../components/aof-email";
import { renderAOFEmail } from "../utils/render-aof-email";

const HIDDEN_JAPANESE =
  /lang="ja"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*lang="ja"/;

const EMAIL = {
  action: {
    href: "https://app.example.test/reset?token=abc&x=1",
    label: "Choose a password",
  },
  body: ["Someone asked to reset the password for this address."],
  footnote: "If it was not you, ignore this email.",
  heading: "Reset your password",
  language: "it",
  look: AOF_EMAIL_LOOK,
  preview: "Reset your password",
  purpose: MAIL.PURPOSE.PASSWORD_RESET,
};

const FLOURISH = {
  face: "serif",
  kanji: {
    [MAIL.PURPOSE.KEEP_ALIVE]: "継",
    [MAIL.PURPOSE.PASSWORD_RESET]: "設",
    [MAIL.PURPOSE.TEST]: "試",
    [MAIL.PURPOSE.VERIFICATION]: "確",
  },
  seal: { background: "#e04a32", ink: "#ffffff", text: "火" },
} as const;

describe("renderAOFEmail", () => {
  it("renders the heading, the words and the action link in HTML", async () => {
    const { html } = await renderAOFEmail(EMAIL);
    expect(html).toContain('lang="it"');
    expect(html).toContain("Reset your password");
    expect(html).toContain(EMAIL.body[0]);
    expect(html).toContain(
      'href="https://app.example.test/reset?token=abc&amp;x=1"'
    );
    expect(html).toContain(EMAIL.look.brand);
  });

  it("renders a plain-text twin carrying the link", async () => {
    const { text } = await renderAOFEmail(EMAIL);
    expect(text.toLowerCase()).toContain(EMAIL.heading.toLowerCase());
    expect(text).toContain(EMAIL.action.href);
    expect(text).toContain(EMAIL.footnote);
    expect(text).not.toContain("<");
  });

  it("is plain without a flourish: no seal, no kanji", async () => {
    const { html } = await renderAOFEmail(EMAIL);
    expect(html).not.toMatch(HIDDEN_JAPANESE);
  });

  it("wears a Design's flourish: its seal in the band and the purpose's kanji by the heading", async () => {
    const { html } = await renderAOFEmail({
      ...EMAIL,
      look: { ...AOF_EMAIL_LOOK, flourish: FLOURISH },
    });
    expect(html).toContain(FLOURISH.seal.text);
    expect(html).toContain(FLOURISH.kanji[MAIL.PURPOSE.PASSWORD_RESET]);
    expect(html).toMatch(HIDDEN_JAPANESE);
  });

  it("keeps the raw link out of sight: the button is the only visible thing that carries it", async () => {
    const { html } = await renderAOFEmail(EMAIL);
    expect(html).not.toContain(`>${EMAIL.action.href.replace("&", "&amp;")}<`);
  });

  it("puts the preview first inside the body, as React Email asks", async () => {
    const { html } = await renderAOFEmail(EMAIL);
    const body = html.slice(html.indexOf("<body"));
    expect(body).toContain(EMAIL.preview);
    expect(body.indexOf(EMAIL.preview)).toBeLessThan(
      body.indexOf(EMAIL.look.brand)
    );
  });

  it("asks clients for both colour schemes and darkens ground, card and quiet text for those that honour it", async () => {
    const { html } = await renderAOFEmail(EMAIL);
    expect(html).toContain('content="light dark" name="color-scheme"');
    expect(html).toContain(
      'content="light dark" name="supported-color-schemes"'
    );
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    for (const color of [
      EMAIL.look.dark.ground,
      EMAIL.look.dark.card,
      EMAIL.look.dark.ink,
      EMAIL.look.dark.muted,
    ]) {
      expect(html).toContain(color);
    }
  });

  it("is one fluid 600px column, with a full-width button on phones for the clients that honour media queries", async () => {
    const { html } = await renderAOFEmail(EMAIL);
    expect(html).toContain("max-width:600px");
    expect(html).toContain("@media (max-width: 480px)");
    expect(html).toContain('class="aof-button"');
  });

  it("escapes the words it is given", async () => {
    const { html } = await renderAOFEmail({
      ...EMAIL,
      heading: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
