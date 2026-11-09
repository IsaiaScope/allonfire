/** @jsxRuntime automatic */
// The API renders this under tsx, which compiles a package's JSX with its
// own default (React.createElement); the pragma keeps it on the automatic runtime.
import type { MailPurpose } from "@allonfire/core/features/mail/constants/mail";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

/**
 * What a Design may add to an email: a seal in the band and a word for each
 * purpose, set large beside the heading. A look with none stays plain.
 */
type AOFEmailFlourish = {
  /** The font stack for the seal and the words, from what mail clients ship. */
  face: string;
  kanji: Readonly<Record<MailPurpose, string>>;
  seal: { background: string; ink: string; text: string };
};

/** What an App's emails wear: its name and the colours mail clients can show. */
export type AOFEmailLook = {
  brand: string;
  /** The same ground, card and text for clients that honour a dark scheme. */
  dark: { card: string; ground: string; ink: string; muted: string };
  flourish?: AOFEmailFlourish | undefined;
  ground: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
};

const DARK_CARD = "#1f2429";

/** The shared AllOnFire look, for mail sent with no App to dress it. */
export const AOF_EMAIL_LOOK: AOFEmailLook = {
  accent: JAPAN_IMAGE_COLOR.light.primary,
  accentInk: JAPAN_IMAGE_COLOR.LINE.GREEN_DEEP_FOREGROUND,
  brand: "AllOnFire",
  dark: {
    card: DARK_CARD,
    ground: JAPAN_IMAGE_COLOR.dark.background,
    ink: JAPAN_IMAGE_COLOR.dark.foreground,
    muted: JAPAN_IMAGE_COLOR.dark.mutedForeground,
  },
  ground: JAPAN_IMAGE_COLOR.light.background,
  ink: JAPAN_IMAGE_COLOR.light.foreground,
  muted: JAPAN_IMAGE_COLOR.light.mutedForeground,
};

export type AOFEmailProps = {
  look: AOFEmailLook;
  /** The Language the words are in, for the document's `lang`. */
  language: string;
  /** The inbox's one-line preview. */
  preview: string;
  /** What the email is for: a Design's flourish picks its word by it. */
  purpose: MailPurpose;
  heading: string;
  body: readonly string[];
  /** The one thing to do, as a button; none for an email that only informs. */
  action?: { href: string; label: string } | undefined;
  /** A closing line: what to do when the email was not expected. */
  footnote: string;
};

const SPACE_PX = 24;
const GROUND_PAD = "16px 8px";
const CARD_PAD = "24px 20px";
const CARD = "#ffffff";
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const WORD_PX = 44;
const SEAL_PX = 36;
/** The widest the column grows: the size every email client shows safely. */
const COLUMN_PX = 600;
/** Below this width a phone gets a full-width button and tighter padding. */
const PHONE_PX = 480;
const CLASS = {
  button: "aof-button",
  card: "aof-card",
  ground: "aof-ground",
  muted: "aof-muted",
};

/**
 * The layout is one fluid column that needs no media query: tables at 100%
 * width up to `COLUMN_PX`, content stacked. This only improves it where
 * supported (not classic Outlook, nor Gmail on third-party accounts): the
 * column goes edge to edge on a phone and the button full width.
 */
const phoneStyles = `@media (max-width: ${PHONE_PX}px) {
  .${CLASS.ground} { padding: 0 !important; }
  .${CLASS.card} { padding: 20px 16px !important; }
  .${CLASS.button} { display: block !important; text-align: center !important; width: 100% !important; }
}`;

/**
 * Dark mode as React Email documents it: both schemes declared, and a media
 * query in the head for the clients that honour it (Apple Mail, iOS Mail,
 * Outlook apps). `!important` beats the inline light colours; clients that
 * ignore it, or invert colours themselves like Gmail, show the light email.
 */
const darkStyles = ({ dark }: AOFEmailLook) =>
  `@media (prefers-color-scheme: dark) {
  .${CLASS.ground} { background-color: ${dark.ground} !important; color: ${dark.ink} !important; }
  .${CLASS.card} { background-color: ${dark.card} !important; }
  .${CLASS.muted} { color: ${dark.muted} !important; }
}`;

/**
 * One transactional email: a band with the brand, a card with a heading, a
 * few lines, at most one action and a footnote. Inline styles only, since
 * mail clients drop stylesheets.
 */
export function AOFEmail({
  action,
  body,
  footnote,
  heading,
  language,
  look,
  preview,
  purpose,
}: AOFEmailProps) {
  const { flourish } = look;
  return (
    <Html lang={language}>
      <Head>
        <meta content="light dark" name="color-scheme" />
        <meta content="light dark" name="supported-color-schemes" />
        <style>{`${phoneStyles}\n${darkStyles(look)}`}</style>
      </Head>
      <Body
        className={CLASS.ground}
        style={{ backgroundColor: look.ground, margin: 0, padding: 0 }}
      >
        <Preview>{preview}</Preview>
        <Section
          className={CLASS.ground}
          style={{
            backgroundColor: look.ground,
            color: look.ink,
            fontFamily: SANS,
            padding: GROUND_PAD,
          }}
        >
          <Container style={{ maxWidth: COLUMN_PX }}>
            <Section
              style={{
                backgroundColor: JAPAN_IMAGE_COLOR.dark.background,
                borderLeft: `6px solid ${look.accent}`,
                borderRadius: "6px 6px 0 0",
                padding: "14px 16px",
              }}
            >
              <Row>
                <Column>
                  <Text
                    style={{
                      color: JAPAN_IMAGE_COLOR.dark.foreground,
                      fontSize: 16,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {look.brand}
                  </Text>
                </Column>
                {flourish ? (
                  <Column align="right" width={SEAL_PX}>
                    <Text
                      aria-hidden="true"
                      lang="ja"
                      style={{
                        backgroundColor: flourish.seal.background,
                        borderRadius: 4,
                        color: flourish.seal.ink,
                        fontFamily: flourish.face,
                        fontSize: 16,
                        fontWeight: 700,
                        lineHeight: `${SEAL_PX}px`,
                        margin: 0,
                        minWidth: SEAL_PX,
                        textAlign: "center",
                      }}
                    >
                      {flourish.seal.text}
                    </Text>
                  </Column>
                ) : null}
              </Row>
            </Section>
            <Section
              className={CLASS.card}
              style={{
                backgroundColor: CARD,
                borderRadius: "0 0 6px 6px",
                padding: CARD_PAD,
              }}
            >
              {flourish ? (
                <Text
                  aria-hidden="true"
                  lang="ja"
                  style={{
                    color: look.accent,
                    fontFamily: flourish.face,
                    fontSize: WORD_PX,
                    lineHeight: `${WORD_PX}px`,
                    margin: `0 0 ${SPACE_PX / 2}px`,
                  }}
                >
                  {flourish.kanji[purpose]}
                </Text>
              ) : null}
              <Heading as="h1" style={{ fontSize: 24, margin: 0 }}>
                {heading}
              </Heading>
              {body.map((line) => (
                <Text key={line} style={{ fontSize: 16, lineHeight: "26px" }}>
                  {line}
                </Text>
              ))}
              {action ? (
                <Section
                  style={{ margin: `${SPACE_PX}px 0 ${SPACE_PX / 2}px` }}
                >
                  <Button
                    className={CLASS.button}
                    href={action.href}
                    style={{
                      backgroundColor: look.accent,
                      borderRadius: 4,
                      boxSizing: "border-box",
                      color: look.accentInk,
                      fontSize: 16,
                      fontWeight: 600,
                      padding: "14px 28px",
                    }}
                  >
                    {action.label}
                  </Button>
                </Section>
              ) : null}
            </Section>
            <Text
              className={CLASS.muted}
              style={{ color: look.muted, fontSize: 14 }}
            >
              {footnote}
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}
