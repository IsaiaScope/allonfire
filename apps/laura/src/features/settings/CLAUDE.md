# Settings Feature -- Claude Guide

## Feature Scope

**Owns:** Language switching UI, appearance/theme card, user info display card, sign-out button.

**Does not own:** Auth logic (uses `@allonfire/auth/client` for sign-out only), theme state (managed by `next-themes` via the shared `ThemeToggle`), i18n routing config (defined in `@/i18n/`), user data fetching (done in the server page).

## File Responsibilities

| File | Purpose |
|------|---------|
| `components/language-card.tsx` | Card shell with icon and title wrapping `LanguageSwitcher` |
| `components/language-switcher.tsx` | Two locale buttons; calls `router.replace(pathname, { locale })` on click |
| `components/appearance-card.tsx` | Card shell wrapping the shared `ThemeToggle` from `@allonfire/ui` |
| `components/user-info-card.tsx` | Displays avatar initials, name, email, role/app badges, and sign-out button |
| `components/sign-out-button.tsx` | Standalone sign-out button (duplicates logic in `UserInfoCard`) |

## Modification Guide

### Add a new settings card

1. Create a new client component in `components/` using the `Card`/`CardHeader`/`CardContent` pattern from `@allonfire/ui`
2. Use `useTranslations("Settings")` for i18n strings
3. Add the component to `app/[locale]/(dashboard)/settings/page.tsx` wrapped in `<AnimatedSection>`
4. Add translation keys to the `Settings` namespace in all locale JSON files

### Change locale options

1. Edit the `locales` array in `components/language-switcher.tsx`
2. Add the matching `labelKey` translation to locale JSON files
3. Ensure the new locale is registered in `@/i18n/` routing config

### Modify user info display

1. Edit `components/user-info-card.tsx` -- all user data arrives as props from the server page
2. If new data is needed, update the `UserInfoCardProps` type and pass it from `settings/page.tsx`

## Gotchas

- **All components are client components** because they use hooks (`useTranslations`, `useLocale`, `useRouter`, `useTheme` via `ThemeToggle`). This is intentional and unavoidable.

- **Duplicate sign-out logic:** Both `SignOutButton` and `UserInfoCard` contain identical `authClient.signOut()` + redirect logic. If updating sign-out behavior, change both or consolidate.

- **next-intl navigation imports:** `LanguageSwitcher` imports `useRouter` and `usePathname` from `@/i18n/navigation` (not `next/navigation`) to get locale-aware routing. `UserInfoCard` and `SignOutButton` use `next/navigation` directly since the sign-out redirect goes to `/login` (non-localized).

- **Initials regex:** `UserInfoCard` splits on `/[\s@]/` to handle both "First Last" and "user@email.com" formats for avatar initials.

## Dependencies

| Package | Why |
|---------|-----|
| `@allonfire/ui` | Card, Button, Badge, ThemeToggle components and `cn` utility |
| `@allonfire/auth/client` | `authClient.signOut()` for sign-out in `UserInfoCard` and `SignOutButton` |
| `next-intl` | `useTranslations`, `useLocale` for i18n |
| `@/i18n/navigation` | Locale-aware `useRouter`, `usePathname` in `LanguageSwitcher` |
| `lucide-react` | Icons: Languages, Sun, User, Mail, LogOut |
| `next/navigation` | `useRouter` for post-sign-out redirect |
