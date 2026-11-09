# Time zone picker: library survey

The provider form's "day ends at midnight in" field is a plain text input:
an Admin must type an IANA zone (`Europe/Rome`) exactly. The survey looks
for a searchable picker over the 418 zones the browser knows
(`Intl.supportedValuesOf("timeZone")`), with "none" for a rolling 24 hours.
Free options only.

| Library | Block | Base | Installs | Fit | Verdict |
|---|---|---|---|---|---|
| shadcn (base-nova) | [Combobox](https://ui.shadcn.com/docs/components/base/combobox) | Base UI | already in `packages/shadcn`, not yet wrapped | An input that filters a list as you type, keyboard and ARIA from Base UI, a clear button for "none". Same family as every other AOF control. | use |
| Base UI | [Combobox](https://base-ui.com/react/components/combobox) | Base UI | the primitive under shadcn's | Its docs show virtualised and grouped lists; useful reference for 418 items grouped by region. | idea only |
| Shadcn Studio | [Combobox](https://shadcnstudio.com/docs/components/combobox) | Radix (cmdk) | copy, migrate to Base UI | Popover + command list; a second pattern for the same job. | skip |
| HTML | `<datalist>` | native | none | Suggests zones as you type, but no styling, and browsers differ. | skip |

Recommendation: wrap shadcn's Combobox as `AOFComboboxField` in
`packages/ui` (bound to the AOF form like the other fields, with the field's
pictogram tile), fed the browser's zone list grouped by region, showing
each zone's current UTC offset (`Europe/Rome · UTC+01:00`).
