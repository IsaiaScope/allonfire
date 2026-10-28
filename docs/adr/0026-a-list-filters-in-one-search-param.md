# A list's filters live in one `search` param

A list page (the Back Office's Users first, Storage's Images next) keeps every
filter and its free text in one URL param, `search`, as `field:value` pairs,
the free words a field like any other (`input:`): `?search=app:laura
role:admin input:isaia` (`+` in the address). A field holds one value or
several, comma-separated, any of which matches (`role:admin,user`). A plain word still reads as text,
so a hand-typed `?search=isaia` works. Page and page size stay params of their
own. Core's search parser reads and writes the string for every
Host from a table of fields and their allowed values; a field or value it does
not know is dropped, never an error, so a hand-edited or old link still opens.

## Considered Options

- One param per filter (`?app=laura&role=admin&q=isaia`): every list grows its
  own params, and each needs its own parser on both the App and the API.
- Positional pipes (`?search=laura|admin|isaia`): a missing field becomes an
  empty slot, and the order carries the meaning.

## Consequences

- Links people keep depend on the grammar: a renamed field or value breaks
  them quietly (it is dropped), so a rename keeps the old spelling as an alias.
- The same string can be typed into a list's search box once it accepts
  `field:value` by hand; the Users list starts with selects that write it.
