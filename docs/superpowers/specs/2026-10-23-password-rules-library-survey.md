# Password rules: library survey

Written 2026-10-23. Add a User shows "The password needs" with two lines. Each line has a dot that turns into a green check once its rule is met:

- at least 8 characters;
- both passwords match.

The owner asked whether a better component exists. Only free items are listed, and every URL answered 200.

## What exists

- **Shadcn Studio `input-46`**, base-nova:
  - Links: https://shadcnstudio.com/preview/components/base/input?index=46, registry `https://shadcnstudio.com/r/components/base-nova/input-46.json` (free, no key).
  - Built on Base UI's `input-group` and `button`.
  - It is a password input with a five-segment strength bar ("Weak" to "Very strong") and a checklist of five rules. The rules are 12+ characters, a lowercase letter, an uppercase letter, a number and a symbol.
  - It is a demo and not a component: its rules are hard-coded, and its colours are raw (`bg-orange-500`, `bg-amber-500`).
  - **Idea only**: the strength bar.
- **Origin UI `comp-51`** (now coss.com/origin):
  - Links: https://coss.com/origin/input, registry `https://coss.com/origin/r/comp-51.json` (free).
  - The same pattern: a four-step progress bar, then "Must contain:" with checks and crosses.
  - It uses plain shadcn `input` and `label`, lucide icons and raw colours (`bg-emerald-500`).
  - **Idea only**.
- **Ui-Layouts "Strong Pass" and "Confirm Pass"**:
  - Link: https://www.ui-layouts.com/components/password.
  - A "Must contain" checklist (8+ characters, a number, a lowercase letter, an uppercase letter, a symbol), and a confirm field as its own example.
  - Copied from the page, with no registry item. **Idea only**.
- **Official shadcn, Shadcnblocks, React Bits, Aceternity UI, Shadcn UI Kit, Shadcn UI Blocks**: no password rules component. **Skip**.
- **21st.dev community items** (Kokonut, HextaUI, ReUI): an install needs a 21st API key, and some have no licence. They are not among the owner's libraries. **Skip**.

## How it compares with what is built

Every candidate is the checklist the page already has (`PasswordRules`), plus one thing: a strength bar scored by how many rules are met. That bar only says something when there are several rules. Here there are two:

- the length, the only rule the User module enforces (`USER.LIMIT.PASSWORD_MIN`);
- the match, a form rule.

None of the candidates wears the Japan Design (tokens, Tabler icons, the line green). Each would need re-dressing, and the page's version already is.

## Recommendation

Keep `PasswordRules`.

If the owner wants a stronger password, there are two steps:

1. Add the rules (a number, an uppercase letter, a symbol) to the User module's schema first, since that check is the one that counts.
2. Then add a segmented strength bar above the list, in the Design's colours: the idea from `input-46`.

## The checklist as a to-do list (owner, 2026-10-23)

The owner asked for the rules drawn as a to-do list. These are the free checkbox items:

- **Shadcn Studio `checkbox-04`**:
  - Links: https://shadcnstudio.com/preview/components/base/checkbox?index=4, registry `https://shadcnstudio.com/r/components/base-nova/checkbox-04.json`.
  - A to-do list: each line a checkbox, struck through once checked.
  - Built on shadcn's `checkbox` and `label` (Base UI, already installed).
  - Here each box would be read-only, ticked by the rule. **Use**.
- **Shadcn Studio `checkbox-18`**:
  - Link: https://shadcnstudio.com/preview/components/base/checkbox?index=18.
  - The same to-do list, animated with `motion`.
  - Imports `radix-ui` even under base-nova. **Idea only**: the strike that draws itself, done in CSS.
- **Shadcn Studio `checkbox-12`**: filled round checks with a check icon, close to today's dot and check. Imports `radix-ui`. **Skip**.
- **shadcn Checkbox**: https://ui.shadcn.com/docs/components/base/checkbox. The primitive `checkbox-04` builds on. Installed.
- **React Bits Animated List**: https://reactbits.dev/components/animated-list. A list whose items slide in as they scroll. It suits long lists, not two or five fixed rules. **Skip**.
