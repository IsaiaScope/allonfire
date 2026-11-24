# Laura Gallery and Favorites: library survey

Surveyed 2026-11-20 for Phase 4 (`docs/superpowers/plans/2026-11-17-laura-p4-gallery-favorites.md`), before its interface tasks (feed, tiles, preview). The owner buys no blocks, so a paid one gets one line. Every URL below answered 200; a page that does not show its code, install command or licence is marked so.

## Pieces

A masonry feed that pages by cursor, a preview with previous, next, swipe and close, a heart on a tile and in the preview, and an Admin Remove.

## Candidates

| Candidate | Free | Base | Fits | Verdict |
|---|---|---|---|---|
| [shadcn.io gallery-lightbox](https://www.shadcn.io/blocks/gallery-lightbox) | Pro | Base UI Dialog | Previous and next, counter, arrow keys, Home and End, touch swipe, full screen on a phone. Static array, no pagination. | skip (Pro); idea only: the same behaviours are in `AOFLightbox` |
| [shadcn.io gallery-masonry](https://www.shadcn.io/blocks/gallery-masonry) | Pro | Base UI, CSS columns | Static list, no pagination. | skip (Pro); idea: CSS columns, as planned |
| [shadcn.io gallery-masonry-hover](https://www.shadcn.io/blocks/gallery-masonry-hover) | Pro | Base UI, CSS columns | Caption and Save show on hover or focus, always on a coarse pointer. | skip (Pro); idea: the touch rule for tile actions |
| [shadcn.io gallery-infinite-scroll](https://www.shadcn.io/blocks/gallery-infinite-scroll) | Pro | Base UI | A one-shot timer over a static array, plus a real "Load more" button. | skip (Pro); idea: a "Load more" button beside the scroll sentinel |
| [21st.dev masonry-lightbox](https://21st.dev/@ayushmxxn/components/masonry-lightbox) | Free (MIT), install needs a 21st API key | `next`, `framer-motion` | Description only; pagination and touch not stated. | skip: a second animation library and a key, for what CSS columns and `AOFLightbox` do |
| [laststance/react-lightbox](https://github.com/laststance/react-lightbox) | Free (MIT) | Not stated | Arrow keys, Escape, click-outside, focus trap, preloading; swipe and on-screen arrows not stated. | skip: ours is tested in both browsers and already swipes |
| [21st.dev image-preview](https://21st.dev/@arihantcodes_1f7b8c4d/components/image-preview.md) | Free (MIT) | Radix Dialog | One thumbnail opening one picture. | skip: Radix, no stepping |
| [Aceternity CTA centered masonry](https://ui.aceternity.com/blocks/cta-sections/cta-centered-masonry-gallery) | Paid (All-Access) | Not stated | A static marketing section. | skip |
| Shadcnblocks gallery 25 and 54, product gallery 2 to 4 | Pro | | | skip |
| React Bits, Ui-Layouts | | | Nothing confirmed. | skip |

## More block sites (second round)

| Candidate | Free | Fits | Verdict |
|---|---|---|---|
| [Shadcnblocks gallery6](https://www.shadcnblocks.com/block/gallery6) and [product-gallery1](https://www.shadcnblocks.com/block/product-gallery1) | Free, Base UI listed | Carousels: no lightbox, no blur, no paging. | skip |
| [Shadcn Studio gallery component](https://shadcnstudio.com/blocks/marketing-ui/gallery-component) | Mixed: 7 and 8 Basic, 11 Pro; licence not stated | A lightbox type over shadcn Dialog; source not shown. | idea only |
| [React Bits Masonry](https://reactbits.dev/components/masonry) | Price and licence not stated | Springs into place, opens a lightbox; static array. | skip: animation library, no paging |
| [Aceternity layout-grid](https://ui.aceternity.com/components/layout-grid) and [parallax-scroll](https://ui.aceternity.com/components/parallax-scroll) | Not labelled | framer-motion, static array, no lightbox. | skip |
| [21st.dev gallery-grid-block](https://21st.dev/@moumensoliman/components/gallery-grid-block-shadcnui) and [gallery-lightbox](https://21st.dev/@f0rextasy/components/gallery-lightbox) | MIT, API key | framer-motion; touch behaviour not shown. | skip |
| [Ui-Layouts](https://ui-layouts.com/components): [Gallery Modal](https://ui-layouts.com/components/gallery-modal), [Media Modal](https://ui-layouts.com/components/media-modal), [Masonary](https://ui-layouts.com/components/masonary-grid) | Components not labelled | Not opened. | open in the owner's tab |
| Official shadcn blocks | Free | No gallery block in the part of the list read. | skip |

## npm libraries (the owner's point: do not write what a known library does)

| Library | Does | Fit | Verdict |
|---|---|---|---|
| [yet-another-react-lightbox](https://github.com/igordanchenko/yet-another-react-lightbox) | Lightbox: swipe, keyboard, preloading, plugins (zoom, captions); controlled; `toolbar.buttons` takes our heart and Remove; `render.slide` draws our own image with the blur. | Replaces `AOFLightbox` and `useAOFSwipe`. Cost: it owns its focus, Escape and CSS (`yarl__*` variables), so Ocean tokens and the safe-area gutter are dressed over it, and it is not Base UI. | candidate: pick or keep ours |
| [react-photo-album](https://github.com/igordanchenko/react-photo-album) | Rows, columns and masonry layouts; SSR through `defaultContainerWidth` or a `skeleton`; own `render.photo`. | Lays out in JS from the container width: a layout shift after hydration unless the skeleton matches, and a page appended can reflow earlier tiles. CSS columns per page (the plan) never move a drawn tile. | idea only |
| [@use-gesture/react](https://github.com/pmndrs/use-gesture) | Swipe and drag hooks. | Replaces `useAOFSwipe` if the lightbox stays ours; 48 lines of ours are tested. | marginal |
| [react-intersection-observer](https://github.com/thebuilder/react-intersection-observer) | `useInView` for the scroll sentinel. | Replaces `AOFInfiniteSentinel`; small either way. | marginal |

## Downloads (npm, last week, 2026-11-20)

`embla-carousel-react` 28.9M, `@use-gesture/react` 10.2M, `react-intersection-observer` 7.0M, `yet-another-react-lightbox` 1.1M, `photoswipe` 872k (not React), `react-image-gallery` 462k, `react-masonry-css` 371k, `react-photo-album` 242k, `masonic` 139k, `lightgallery` 129k (GPL-3.0 or commercial: out). All MIT otherwise; every React peer range includes 19.

## Reading

No free block pages by cursor, hearts a Favorite, or removes a photo, and every free one adds an animation library, a registry key or Radix. Ideas kept from the Pro blocks: tile actions visible on a coarse pointer and on focus, never hover only; a "Load more" button beside the scroll sentinel, so a visitor without scroll events still reaches the next page.

## Pick (owner, 2026-11-20)

- **Adopt `yet-another-react-lightbox`** for the preview. `AOFLightbox` (packages/ui) becomes a thin wrapper over it, dressed in the Ocean tokens and the safe-area gutter, the heart and Remove in its toolbar, our slide drawing the blur. `useAOFSwipe`, `AOF_SWIPE` and the hand-written dialog are deleted.
- **Masonry: a CSS grid whose tiles span rows from their stored ratio** (side C of the throwaway comparison, 2026-11-20). One continuous list, no library, no JavaScript layout: the server renders the final layout, nothing is measured, appending a page moves no drawn tile, the order reads row by row, and a resize is instant. Measured in Chromium and WebKit on 36 photos: about 10.7% of the area is not covered by a tile (gutters included, the same as every other option), no layout shift, 0 of 24 tiles moved when page 2 loaded. Costs: a tile's height is a rounded number of row units (about 1% off its ratio at precision 40, hidden by `object-cover`), gutters are padding (the grid's `gap` breaks the span arithmetic), and it needs CSS `round()` and container units (Chromium 125, Safari 15.4, Firefox 118; Firefox not run here).
- **Rejected for masonry:** CSS columns per page (ragged gap at every page seam, column-by-column order), `react-responsive-masonry` (measures after mount: layout shift 0.042 on load, 35 of 36 tiles jump on a resize, a list per column), TanStack Virtual lanes and our own shortest-column (client-side layout, jump on resize), `react-photo-album`, `masonic`, `@virtuoso.dev/masonry`. `@masonry-grid/react` (756 downloads a week, one release in November 2025) implements the same spans idea; not adopted, since it is about 15 lines of CSS.
- **Kept:** `AOFInfiniteSentinel`, with a "Load more" button beside it.
- No block from any site is installed.
