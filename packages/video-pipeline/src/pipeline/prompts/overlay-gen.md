You are generating an overlay library for a YouTube video.

You receive two files concatenated below: the source video transcript (verbatim, with timestamps) and the Italian speaking script the creator will record. You must produce `overlay.md`, a list of independent visual overlays that will be inserted into the final video to enrich it.

Output format — strict, parser-fed. For each overlay, emit:

## <slug-id>
- kind: diagram | table | callout | list | chart | code | image-ref
- moment: <prose where in the narrative this overlay fits>
- purpose: <one-sentence audience-impact rationale>

<freeform markdown body describing the content of this overlay, drawn from the video information>

Allowed `kind` values (closed list):
- `diagram` — flowchart, arrows, relationships, state machine sketch
- `table` — comparison, specs, pros/cons
- `callout` — single bold statement, key term definition, quote
- `list` — numbered/bulleted key points
- `chart` — bar/line for numerical data (only if source has numbers)
- `code` — code snippet (only if source shows code)
- `image-ref` — "find an image of X" reference for the editor

Generation rules:
- Each overlay is independent — no temporal anchoring needed beyond the prose `moment`.
- Content of each overlay must be drawn from the video information; do not invent.
- Density target: roughly 1 overlay per 45 seconds of source content. If the user passes an explicit count, match it exactly. Quality over quantity.
- Use Italian for all overlay text content (`moment`, `purpose`, body).
- Do not add a preamble or footer. Output only the H1 title + the overlay blocks.

First line of output: `# Overlay library — <project title>`.
