import { renderToStaticMarkup } from "react-dom/server";
import {
  type AspectFormatId,
  archetypes,
  aspectFormats,
  type PreviewModeId,
  previewModes,
} from "./gallery-data";

type Archetype = (typeof archetypes)[number];

const css = `
:root {
  color-scheme: dark;
  --ink: oklch(0.17 0.018 238);
  --ink-2: oklch(0.22 0.019 232);
  --panel: oklch(0.27 0.021 228);
  --panel-2: oklch(0.33 0.023 222);
  --line: oklch(0.48 0.024 226 / 0.52);
  --text: oklch(0.92 0.018 78);
  --muted: oklch(0.71 0.023 82);
  --quiet: oklch(0.58 0.025 230);
  --orange: oklch(0.69 0.19 48);
  --amber: oklch(0.76 0.13 82);
  --green: oklch(0.7 0.14 153);
  --cyan: oklch(0.72 0.12 205);
  --red: oklch(0.66 0.16 31);
  --shadow: 0 28px 70px oklch(0.07 0.02 238 / 0.42);
  --font-ui: Roboto, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: "Roboto Mono", "SFMono-Regular", Consolas, monospace;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  background:
    linear-gradient(135deg, oklch(0.2 0.018 236), oklch(0.14 0.014 238)),
    var(--ink);
  color: var(--text);
  font-family: var(--font-ui);
}

button {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: oklch(0.27 0.018 231);
  color: var(--text);
  cursor: pointer;
  font: 600 13px/1 var(--font-ui);
  padding: 10px 12px;
}

button:hover,
button.is-active {
  border-color: var(--orange);
  color: var(--orange);
}

.gallery-shell {
  margin: 0 auto;
  max-width: 1680px;
  padding: 32px;
}

.gallery-header {
  align-items: end;
  display: grid;
  gap: 18px;
  grid-template-columns: 1fr auto;
  margin-bottom: 28px;
}

.gallery-title {
  margin: 0 0 8px;
  font-size: 28px;
  line-height: 1.1;
}

.gallery-copy {
  color: var(--muted);
  margin: 0;
  max-width: 72ch;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.stage-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
}

.stage {
  min-width: 0;
}

.stage-meta {
  align-items: center;
  color: var(--muted);
  display: flex;
  font-size: 12px;
  justify-content: space-between;
  letter-spacing: 0.04em;
  margin: 0 0 10px;
  text-transform: uppercase;
}

.canvas {
  aspect-ratio: 16 / 9;
  background: var(--ink);
  border: 1px solid oklch(0.52 0.024 224 / 0.42);
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
  position: relative;
  width: 100%;
}

.stage.is-tall {
  justify-self: center;
  max-width: 370px;
  width: 100%;
}

.stage.is-tall .canvas {
  aspect-ratio: 9 / 16;
}

.video-layer {
  background:
    linear-gradient(90deg, oklch(0.16 0.018 238), oklch(0.25 0.028 224)),
    var(--ink);
  inset: 0;
  position: absolute;
}

.video-grid {
  background-image:
    linear-gradient(oklch(0.75 0.02 220 / 0.07) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.75 0.02 220 / 0.07) 1px, transparent 1px);
  background-size: 56px 56px;
  inset: 0;
  opacity: 0.42;
  position: absolute;
}

.source-window {
  background: oklch(0.2 0.014 240 / 0.78);
  border: 1px solid oklch(0.78 0.018 86 / 0.22);
  border-radius: 8px;
  color: oklch(0.78 0.02 84 / 0.6);
  font: 700 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  padding: 12px 14px;
  position: absolute;
  right: 5.5%;
  text-transform: uppercase;
  top: 7%;
}

.caption-band {
  background: oklch(0.12 0.018 238 / 0.78);
  border-top: 1px solid oklch(0.78 0.018 86 / 0.14);
  bottom: 5.5%;
  height: 8%;
  left: 8%;
  position: absolute;
  right: 8%;
}

.safe-area {
  border: 1px dashed oklch(0.82 0.024 84 / 0.22);
  border-radius: 6px;
  inset: 6%;
  position: absolute;
}

.stage.is-tall .safe-area {
  inset: 5% 7%;
}

.overlay-root {
  align-content: center;
  background:
    linear-gradient(145deg, oklch(0.26 0.018 232 / 0.98), oklch(0.19 0.016 238 / 0.98)),
    var(--panel);
  border: 1px solid oklch(0.66 0.04 82 / 0.2);
  border-radius: 8px;
  box-shadow: 0 18px 48px oklch(0.08 0.018 238 / 0.34);
  display: grid;
  gap: 18px;
  grid-template-rows: auto auto;
  inset: 8%;
  padding: 28px;
  position: absolute;
}

.stage.is-tall .overlay-root {
  gap: 16px;
  inset: 6% 7%;
  padding: 22px;
}

.overlay-linear-diagram {
  align-content: stretch;
  gap: 28px;
  grid-template-rows: auto 1fr;
  inset: 7.5%;
  padding: 42px 48px 46px;
}

.stage.is-tall .overlay-linear-diagram {
  gap: 24px;
  inset: 8% 7.5%;
  padding: 42px 40px 44px;
}

.overlay-kicker {
  color: var(--orange);
  font: 700 12px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.overlay-title {
  font-size: 34px;
  line-height: 1.02;
  margin: 6px 0 0;
  max-width: 15ch;
}

.stage.is-tall .overlay-title {
  font-size: 28px;
  max-width: 11ch;
}

.overlay-note {
  color: var(--muted);
  font-size: 16px;
  line-height: 1.4;
  margin: 8px 0 0;
  max-width: 52ch;
}

.stage.is-tall .overlay-note {
  font-size: 13px;
}

.topline {
  align-items: start;
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.chip {
  border: 1px solid oklch(0.65 0.04 86 / 0.22);
  border-radius: 999px;
  color: var(--muted);
  font: 700 11px/1 var(--font-mono);
  padding: 7px 9px;
  text-transform: uppercase;
}

.chip.is-hot {
  border-color: oklch(0.74 0.17 50 / 0.52);
  color: var(--orange);
}

.dashboard-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr 1fr 1fr;
  min-height: 0;
}

.stage.is-tall .dashboard-grid {
  grid-template-columns: 1fr;
}

.panel {
  background: oklch(0.3 0.018 230 / 0.84);
  border: 1px solid var(--line);
  border-radius: 7px;
  min-width: 0;
  padding: 14px;
}

.panel-head {
  align-items: center;
  display: flex;
  font: 700 12px/1 var(--font-mono);
  justify-content: space-between;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.panel-count {
  color: var(--orange);
}

.row {
  align-items: center;
  border-top: 1px solid oklch(0.56 0.018 230 / 0.18);
  display: grid;
  gap: 10px;
  grid-template-columns: 9px 1fr auto;
  padding: 10px 0 0;
}

.row + .row {
  margin-top: 10px;
}

.dot {
  background: var(--cyan);
  border-radius: 999px;
  height: 9px;
  width: 9px;
}

.dot.is-orange {
  background: var(--orange);
}

.dot.is-green {
  background: var(--green);
}

.row-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-detail {
  color: var(--quiet);
  display: block;
  font: 600 11px/1.3 var(--font-mono);
  margin-top: 4px;
}

.mono {
  font-family: var(--font-mono);
}

.terminal-layout,
.compare-layout,
.matrix-layout {
  display: grid;
  gap: 16px;
  grid-template-columns: 1.2fr 0.8fr;
  min-height: 0;
}

.stage.is-tall .terminal-layout,
.stage.is-tall .compare-layout,
.stage.is-tall .matrix-layout {
  grid-template-columns: 1fr;
}

.terminal {
  background: oklch(0.13 0.02 238);
  border: 1px solid oklch(0.58 0.03 230 / 0.4);
  border-radius: 7px;
  color: oklch(0.84 0.02 86);
  font: 500 14px/1.55 var(--font-mono);
  overflow: hidden;
  padding: 16px;
}

.stage.is-tall .terminal {
  font-size: 11px;
}

.prompt {
  color: var(--orange);
}

.terminal-line.is-muted {
  color: var(--quiet);
}

.terminal-line.is-ok {
  color: var(--green);
}

.callout {
  align-content: center;
  display: grid;
  gap: 12px;
}

.callout strong {
  color: var(--text);
  font-size: 22px;
  line-height: 1.15;
}

.callout p {
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}

.flow {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, 1fr);
  min-height: 0;
}

.stage.is-tall .flow {
  align-items: stretch;
  grid-template-columns: 1fr;
}

.linear-rail {
  align-items: stretch;
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-template-rows: 1fr 1fr;
  position: relative;
}

.stage.is-tall .linear-rail {
  gap: 20px;
  grid-template-columns: 1fr;
  grid-template-rows: none;
}

.linear-rail::before {
  background: transparent;
  border: solid var(--line);
  border-radius: 999px;
  border-width: 2px 2px 2px 0;
  content: "";
  height: 53%;
  left: 13%;
  position: absolute;
  right: 16%;
  top: 15%;
}

.stage.is-tall .linear-rail::before {
  background: var(--line);
  border: 0;
  bottom: 22px;
  height: auto;
  left: 30px;
  right: auto;
  top: 28px;
  width: 3px;
}

.linear-node {
  background: oklch(0.25 0.019 232 / 0.9);
  display: grid;
  gap: 16px;
  min-height: 220px;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.linear-node:nth-child(1) {
  grid-column: 1 / 3;
  grid-row: 1;
}

.linear-node:nth-child(2) {
  grid-column: 3 / 5;
  grid-row: 1;
}

.linear-node:nth-child(3) {
  grid-column: 5 / 7;
  grid-row: 1;
}

.linear-node:nth-child(4) {
  grid-column: 2 / 4;
  grid-row: 2;
}

.linear-node:nth-child(5) {
  grid-column: 4 / 6;
  grid-row: 2;
}

.stage.is-tall .linear-node {
  grid-column: auto;
  grid-row: auto;
  min-height: 188px;
  padding: 24px 24px 24px 94px;
}

.linear-node.is-active {
  background:
    linear-gradient(145deg, oklch(0.31 0.024 232 / 0.96), oklch(0.22 0.019 238 / 0.96));
  border-color: oklch(0.74 0.17 50 / 0.58);
  box-shadow: 0 18px 46px oklch(0.07 0.018 238 / 0.32);
}

.linear-head {
  align-items: start;
  display: grid;
  gap: 18px;
  grid-template-columns: 60px minmax(0, 1fr);
}

.stage.is-tall .linear-head {
  display: block;
}

.linear-mark {
  align-items: center;
  background: oklch(0.18 0.018 238);
  border: 2px solid var(--cyan);
  border-radius: 999px;
  color: var(--cyan);
  display: flex;
  font: 800 21px/1 var(--font-mono);
  height: 60px;
  justify-content: center;
  position: relative;
  width: 60px;
  z-index: 1;
}

.linear-node.is-active .linear-mark {
  background: oklch(0.69 0.19 48 / 0.16);
  border-color: var(--orange);
  color: var(--orange);
}

.linear-node.is-complete .linear-mark {
  border-color: var(--green);
  color: var(--green);
}

.stage.is-tall .linear-mark {
  left: 18px;
  position: absolute;
  top: 24px;
}

.linear-title {
  display: block;
  font-size: 31px;
  font-weight: 850;
  line-height: 1.05;
}

.linear-meta {
  color: var(--quiet);
  display: block;
  font: 700 18px/1.3 var(--font-mono);
  margin-top: 9px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.linear-media {
  border: 1px solid oklch(0.72 0.03 84 / 0.22);
  border-radius: 14px;
  min-height: 96px;
  overflow: hidden;
}

.linear-media.is-image {
  background:
    linear-gradient(135deg, oklch(0.69 0.19 48 / 0.82), oklch(0.33 0.023 222)),
    var(--panel);
  display: grid;
  padding: 14px;
}

.linear-media.is-tool {
  background: oklch(0.22 0.019 232);
  display: grid;
  gap: 8px;
  padding: 14px;
}

.linear-media.is-code {
  background: oklch(0.13 0.02 238);
  color: oklch(0.84 0.02 86);
  font: 700 16px/1.45 var(--font-mono);
  padding: 14px;
}

.media-grid {
  background-image:
    linear-gradient(oklch(0.9 0.01 84 / 0.16) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.9 0.01 84 / 0.14) 1px, transparent 1px);
  background-size: 22px 22px;
  border-radius: 8px;
  min-height: 70px;
}

.tool-line {
  background: oklch(0.72 0.03 84 / 0.16);
  border-radius: 999px;
  height: 14px;
}

.impact-stage {
  display: grid;
  gap: 34px;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
}

.impact-body {
  align-items: stretch;
  display: grid;
  gap: 44px;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  min-height: 0;
}

.stage.is-tall .impact-body {
  gap: 28px;
  grid-template-columns: 1fr;
}

.impact-visual {
  align-items: center;
  background:
    radial-gradient(circle at 28% 20%, oklch(0.69 0.19 48 / 0.3), transparent 34%),
    linear-gradient(145deg, oklch(0.12 0.018 238), oklch(0.2 0.02 232));
  border: 2px solid var(--orange);
  border-radius: 24px;
  display: flex;
  justify-content: center;
  min-height: 330px;
  overflow: hidden;
  padding: 34px;
}

.stage.is-tall .impact-visual {
  min-height: 380px;
  padding: 28px;
}

.impact-local-asset {
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  height: 100%;
  width: 100%;
}

.impact-copy {
  align-content: center;
  display: grid;
  gap: 28px;
}

.stage.is-tall .impact-copy {
  gap: 20px;
}

.impact-mark {
  align-items: center;
  background: oklch(0.69 0.19 48 / 0.16);
  border: 3px solid var(--orange);
  border-radius: 999px;
  color: var(--orange);
  display: flex;
  font: 860 27px/1 var(--font-mono);
  height: 88px;
  justify-content: center;
  width: 88px;
}

.stage.is-tall .impact-mark {
  font-size: 25px;
  height: 82px;
  width: 82px;
}

.impact-label {
  color: var(--text);
  font-size: 82px;
  font-weight: 880;
  line-height: 0.95;
  margin: 0;
}

.stage.is-tall .impact-label {
  font-size: 64px;
}

.impact-meta {
  color: var(--orange);
  font: 780 22px/1 var(--font-mono);
  letter-spacing: 0.04em;
  margin-top: 18px;
  text-transform: uppercase;
}

.impact-sequence {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  height: 82px;
}

.stage.is-tall .impact-sequence {
  gap: 10px;
  height: 94px;
}

.impact-step {
  align-content: center;
  background: oklch(0.2 0.018 232 / 0.68);
  border: 1px solid var(--line);
  border-radius: 16px;
  display: grid;
  gap: 8px;
  height: 100%;
  opacity: 0.52;
  padding: 12px 10px;
}

.stage.is-tall .impact-step {
  padding: 10px 8px;
}

.impact-step.is-active {
  background: oklch(0.69 0.19 48 / 0.16);
  border-color: var(--orange);
  opacity: 1;
}

.impact-step-index {
  color: var(--cyan);
  font: 850 15px/1 var(--font-mono);
}

.impact-step.is-active .impact-step-index {
  color: var(--orange);
}

.impact-step-label {
  color: var(--text);
  font-size: 17px;
  font-weight: 820;
  line-height: 1.05;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage.is-tall .impact-step-label {
  font-size: 15px;
}

.flow-step {
  min-height: 128px;
  position: relative;
}

.flow-step.is-active {
  border-color: oklch(0.72 0.16 50 / 0.64);
}

.step-number {
  color: var(--orange);
  font: 800 18px/1 var(--font-mono);
}

.step-label {
  font-size: 16px;
  font-weight: 800;
  margin-top: 18px;
}

.step-output {
  color: var(--quiet);
  font: 700 11px/1.3 var(--font-mono);
  margin-top: 10px;
}

.vs-mark {
  align-self: center;
  color: var(--orange);
  font: 800 18px/1 var(--font-mono);
  justify-self: center;
}

.compare-layout {
  grid-template-columns: 1fr auto 1fr;
}

.stage.is-tall .compare-layout {
  grid-template-columns: 1fr;
}

.compare-list {
  display: grid;
  gap: 10px;
  margin: 14px 0 0;
  padding: 0;
}

.compare-list li {
  color: var(--muted);
  list-style: none;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
}

.matrix-table th,
.matrix-table td {
  border-bottom: 1px solid oklch(0.56 0.018 230 / 0.2);
  color: var(--muted);
  font-size: 13px;
  padding: 10px 8px;
  text-align: left;
}

.matrix-table th {
  color: var(--text);
  font: 800 11px/1 var(--font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.matrix-table strong {
  color: var(--text);
}

.stage.is-tall .matrix-table th:nth-child(3),
.stage.is-tall .matrix-table td:nth-child(3) {
  display: none;
}

.map {
  display: grid;
  gap: 14px;
  grid-template-columns: 0.95fr 1.1fr;
  min-height: 0;
}

.stage.is-tall .map {
  grid-template-columns: 1fr;
}

.core {
  align-content: center;
  border-color: oklch(0.72 0.16 50 / 0.48);
  display: grid;
  min-height: 220px;
}

.core strong {
  font-size: 28px;
  line-height: 1.08;
}

.satellites {
  display: grid;
  gap: 10px;
}

.satellite {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: auto 1fr;
}

.satellite-index {
  color: var(--orange);
  font: 800 13px/1 var(--font-mono);
}

body.is-shot {
  background: var(--ink);
  height: 100vh;
  overflow: hidden;
  width: 100vw;
}

body.is-shot .gallery-shell {
  max-width: none;
  padding: 0;
}

body.is-shot .gallery-header,
body.is-shot .stage-meta {
  display: none;
}

body.is-shot .stage-grid {
  display: block;
}

body.is-shot .stage {
  display: none;
}

body.is-shot .stage.is-active-shot {
  display: block;
  height: 100vh;
  max-width: none;
  width: 100vw;
}

body.is-shot .canvas {
  border: 0;
  border-radius: 0;
  height: 100vh;
  width: 100vw;
}
`;

const clientScript = `
(() => {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  const format = params.get("format") || "16x9";
  const mode = params.get("mode") || "standalone";
  const stages = Array.from(document.querySelectorAll(".stage"));

  const activate = (nextFormat, nextMode) => {
    for (const stage of stages) {
      const visible = stage.dataset.format === nextFormat && stage.dataset.mode === nextMode;
      stage.hidden = !visible;
    }
    for (const button of document.querySelectorAll("[data-filter-format]")) {
      button.classList.toggle("is-active", button.dataset.filterFormat === nextFormat);
    }
    for (const button of document.querySelectorAll("[data-filter-mode]")) {
      button.classList.toggle("is-active", button.dataset.filterMode === nextMode);
    }
  };

  if (shot) {
    document.body.classList.add("is-shot");
    for (const stage of stages) {
      const selected =
        stage.dataset.archetype === shot &&
        stage.dataset.format === format &&
        stage.dataset.mode === mode;
      stage.classList.toggle("is-active-shot", selected);
    }
    return;
  }

  activate("16x9", "standalone");
  document.querySelectorAll("[data-filter-format]").forEach((button) => {
    button.addEventListener("click", () => activate(button.dataset.filterFormat, document.querySelector("[data-filter-mode].is-active").dataset.filterMode));
  });
  document.querySelectorAll("[data-filter-mode]").forEach((button) => {
    button.addEventListener("click", () => activate(document.querySelector("[data-filter-format].is-active").dataset.filterFormat, button.dataset.filterMode));
  });
})();
`;

const dashboardSections = [
  {
    count: "02",
    dots: "is-orange",
    label: "Da rispondere",
    rows: [
      ["dark-mode", "domanda aperta", "4m"],
      ["release-notes", "conferma richiesta", "11m"],
    ],
  },
  {
    count: "04",
    dots: "",
    label: "In corso",
    rows: [
      ["perf-audit", "analizzando", "7m"],
      ["payment-migration", "scrivendo test", "2m"],
    ],
  },
  {
    count: "01",
    dots: "is-green",
    label: "Completati",
    rows: [["test-coverage", "pronto per review", "0s"]],
  },
];

function VideoLayer() {
  return (
    <div className="video-layer">
      <div className="video-grid" />
      <div className="source-window">source video</div>
      <div className="caption-band" />
    </div>
  );
}

function OverlayChrome({
  archetype,
  children,
}: {
  archetype: Archetype;
  children: React.ReactNode;
}) {
  return (
    <div className={`overlay-root overlay-${archetype.id}`}>
      <div className="topline">
        <div>
          <div className="overlay-kicker">AllOnFire overlay</div>
          <h2 className="overlay-title">{archetype.label}</h2>
          <p className="overlay-note">{archetype.summary}</p>
        </div>
        <div className="chip-row">
          <span className="chip is-hot">AI tools</span>
          <span className="chip">IT voice</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function DashboardTriage({ archetype }: { archetype: Archetype }) {
  return (
    <OverlayChrome archetype={archetype}>
      <div className="dashboard-grid">
        {dashboardSections.map((section) => (
          <div className="panel" key={section.label}>
            <div className="panel-head">
              <span>{section.label}</span>
              <span className="panel-count">{section.count}</span>
            </div>
            {section.rows.map(([title, detail, time]) => (
              <div className="row" key={title}>
                <span className={`dot ${section.dots}`} />
                <span>
                  <span className="row-title">{title}</span>
                  <span className="row-detail">{detail}</span>
                </span>
                <span className="row-detail">{time}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </OverlayChrome>
  );
}

function TerminalCode({ archetype }: { archetype: Archetype }) {
  return (
    <OverlayChrome archetype={archetype}>
      <div className="terminal-layout">
        <div className="terminal">
          <div className="terminal-line">
            <span className="prompt">$</span> pnpm video overlay ./raw
          </div>
          <div className="terminal-line is-muted">
            moment scout: 18 candidates
          </div>
          <div className="terminal-line is-muted">frames: 54 sampled</div>
          <div className="terminal-line is-ok">visual evidence found</div>
          <div className="terminal-line">overlay.md written</div>
        </div>
        <div className="callout">
          <strong>Surface the exact command, then the consequence.</strong>
          <p>
            Use this when the viewer must connect a terminal action to the file
            it creates.
          </p>
        </div>
      </div>
    </OverlayChrome>
  );
}

function ProcessFlow({ archetype }: { archetype: Archetype }) {
  const steps = ["download", "transcribe", "translate", "overlay", "render"];
  return (
    <OverlayChrome archetype={archetype}>
      <div className="flow">
        {steps.map((step, index) => (
          <div
            className={`panel flow-step ${step === "overlay" ? "is-active" : ""}`}
            key={step}
          >
            <div className="step-number">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="step-label">{step}</div>
            <div className="step-output">
              {step === "overlay" ? "overlay.md" : `${step}.artifact`}
            </div>
          </div>
        ))}
      </div>
    </OverlayChrome>
  );
}

function LinearDiagram({ archetype }: { archetype: Archetype }) {
  const steps = [
    {
      asset: "../public/linear-diagram/chatgpt.svg",
      label: "ChatGPT",
      media: "tool",
      meta: "ask",
      status: "complete",
    },
    {
      asset: "../public/linear-diagram/claude-code.svg",
      code: "claude code",
      label: "Claude Code",
      media: "code",
      meta: "agent",
      status: "complete",
    },
    {
      asset: "../public/linear-diagram/codex.svg",
      label: "Codex",
      media: "image",
      meta: "active",
      status: "active",
    },
    {
      asset: "../public/linear-diagram/anthropic.svg",
      code: "messages.create",
      label: "Anthropic",
      media: "code",
      meta: "api",
      status: "queued",
    },
    {
      asset: "../public/linear-diagram/render-video.svg",
      label: "Render",
      media: "image",
      meta: "mp4",
      status: "queued",
    },
  ];
  const activeIndex = 2;
  const activeStep = steps[activeIndex];

  return (
    <OverlayChrome archetype={archetype}>
      <div className="impact-stage">
        <div className="impact-body">
          <div className="impact-visual">
            <div
              className="impact-local-asset"
              style={{ backgroundImage: `url(${activeStep.asset})` }}
            />
          </div>
          <div className="impact-copy">
            <div className="impact-mark">
              {String(activeIndex + 1).padStart(2, "0")}
            </div>
            <div>
              <h3 className="impact-label">{activeStep.label}</h3>
              <div className="impact-meta">{activeStep.meta}</div>
            </div>
          </div>
        </div>
        <div className="impact-sequence">
          {steps.map((step, index) => (
            <div
              className={`impact-step ${index === activeIndex ? "is-active" : ""}`}
              key={step.label}
            >
              <span className="impact-step-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="impact-step-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </OverlayChrome>
  );
}

function BeforeAfter({ archetype }: { archetype: Archetype }) {
  return (
    <OverlayChrome archetype={archetype}>
      <div className="compare-layout">
        <div className="panel">
          <div className="panel-head">Prima</div>
          <ul className="compare-list">
            <li>Manual notes after watching</li>
            <li>One-off overlay ideas</li>
            <li>No visual evidence pass</li>
          </ul>
        </div>
        <div className="vs-mark">VS</div>
        <div className="panel">
          <div className="panel-head">Dopo</div>
          <ul className="compare-list">
            <li>Transcript-guided scout</li>
            <li>Reusable overlay archetypes</li>
            <li>Mockup before Remotion</li>
          </ul>
        </div>
      </div>
    </OverlayChrome>
  );
}

function DecisionMatrix({ archetype }: { archetype: Archetype }) {
  return (
    <OverlayChrome archetype={archetype}>
      <div className="matrix-layout">
        <div className="panel">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Speed</th>
                <th>Reuse</th>
                <th>Pick</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>CLI first</strong>
                </td>
                <td>High</td>
                <td>Medium</td>
                <td>No</td>
              </tr>
              <tr>
                <td>
                  <strong>Mockup first</strong>
                </td>
                <td>Medium</td>
                <td>High</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>
                  <strong>Template first</strong>
                </td>
                <td>Low</td>
                <td>High</td>
                <td>Later</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="callout">
          <strong>Use when the choice is the lesson.</strong>
          <p>
            Keep the selected path visible without turning the overlay into a
            spreadsheet.
          </p>
        </div>
      </div>
    </OverlayChrome>
  );
}

function ConceptMap({ archetype }: { archetype: Archetype }) {
  const satellites = [
    "Transcript anchor",
    "Visual evidence",
    "Template props",
    "Render target",
  ];
  return (
    <OverlayChrome archetype={archetype}>
      <div className="map">
        <div className="panel core">
          <span className="overlay-kicker">Core idea</span>
          <strong>Overlay as product UI</strong>
          <p className="overlay-note">
            A visual aid has state, hierarchy, and constraints, just like a tool
            surface.
          </p>
        </div>
        <div className="satellites">
          {satellites.map((satellite, index) => (
            <div className="panel satellite" key={satellite}>
              <span className="satellite-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{satellite}</span>
            </div>
          ))}
        </div>
      </div>
    </OverlayChrome>
  );
}

function ArchetypeContent({ archetype }: { archetype: Archetype }) {
  switch (archetype.id) {
    case "dashboard-triage":
      return <DashboardTriage archetype={archetype} />;
    case "terminal-code":
      return <TerminalCode archetype={archetype} />;
    case "process-flow":
      return <ProcessFlow archetype={archetype} />;
    case "linear-diagram":
      return <LinearDiagram archetype={archetype} />;
    case "before-after":
      return <BeforeAfter archetype={archetype} />;
    case "decision-matrix":
      return <DecisionMatrix archetype={archetype} />;
    case "concept-map":
      return <ConceptMap archetype={archetype} />;
    default:
      return null;
  }
}

function Stage({
  archetype,
  format,
  mode,
}: {
  archetype: Archetype;
  format: AspectFormatId;
  mode: PreviewModeId;
}) {
  return (
    <section
      className={`stage ${format === "9x16" ? "is-tall" : "is-wide"}`}
      data-archetype={archetype.id}
      data-format={format}
      data-mode={mode}
    >
      <div className="stage-meta">
        <span>{archetype.label}</span>
        <span>
          {format} / {mode}
        </span>
      </div>
      <div className="canvas">
        {mode === "over-video" ? <VideoLayer /> : null}
        {mode === "over-video" ? <div className="safe-area" /> : null}
        <ArchetypeContent archetype={archetype} />
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <main className="gallery-shell">
      <header className="gallery-header">
        <div>
          <h1 className="gallery-title">AllOnFire overlay mockups</h1>
          <p className="gallery-copy">
            Reusable HTML prototypes for AI-tool explainer overlays. Review the
            theme here, then convert approved archetypes into Remotion
            templates.
          </p>
        </div>
        <div className="toolbar">
          {aspectFormats.map((format) => (
            <button
              data-filter-format={format.id}
              key={format.id}
              type="button"
            >
              {format.label}
            </button>
          ))}
          {previewModes.map((mode) => (
            <button data-filter-mode={mode.id} key={mode.id} type="button">
              {mode.label}
            </button>
          ))}
        </div>
      </header>
      <div className="stage-grid">
        {archetypes.flatMap((archetype) =>
          aspectFormats.flatMap((format) =>
            previewModes.map((mode) => (
              <Stage
                archetype={archetype}
                format={format.id}
                key={`${archetype.id}-${format.id}-${mode.id}`}
                mode={mode.id}
              />
            ))
          )
        )}
      </div>
    </main>
  );
}

export function renderGalleryHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AllOnFire overlay mockups</title>
  <style>${css}</style>
</head>
<body>
${renderToStaticMarkup(<Gallery />)}
<script>${clientScript}</script>
</body>
</html>`;
}
