import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  DashboardRow,
  DashboardSection,
  DashboardTriageProps,
} from "./spec";

const UI_EASE = Easing.bezier(0.16, 1, 0.3, 1);
const MONO_FONT = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';
const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export type DashboardTriageLayout = {
  bodyPadding: string;
  detailBelow: boolean;
  footerFontSize: number;
  headerHeight: number;
  metricFontSize: number;
  panelGap: number;
  panelPadding: string;
  portrait: boolean;
  rowDetailFontSize: number;
  rowGridTemplateColumns: string;
  rowMinHeight: number;
  rowNameFontSize: number;
  sectionCountFontSize: number;
  sectionGap: number;
  sectionsGridTemplateColumns: string;
  sectionLabelFontSize: number;
  shellHeight: number;
  shellWidth: number;
  statusFontSize: number;
  titleFontSize: number;
};

export function getDashboardTriageLayout(
  width: number,
  height: number
): DashboardTriageLayout {
  const portrait = height > width;
  const shellWidth = Math.round(
    portrait ? Math.min(width * 0.84, 900) : Math.min(width * 0.7, 1340)
  );
  const shellHeight = Math.round(
    portrait ? Math.min(height * 0.68, 1320) : Math.min(height * 0.7, 760)
  );

  return {
    bodyPadding: portrait ? "30px 34px 34px" : "32px 38px",
    detailBelow: true,
    footerFontSize: portrait ? 18 : 20,
    headerHeight: portrait ? 60 : 62,
    metricFontSize: portrait ? 18 : 20,
    panelGap: portrait ? 14 : 18,
    panelPadding: portrait ? "20px 22px 22px" : "18px 20px 20px",
    portrait,
    rowDetailFontSize: portrait ? 18 : 17,
    rowGridTemplateColumns: portrait
      ? "18px minmax(0, 1fr) 58px"
      : "20px minmax(0, 1fr) 58px",
    rowMinHeight: portrait ? 66 : 64,
    rowNameFontSize: portrait ? 20 : 18,
    sectionCountFontSize: portrait ? 20 : 18,
    sectionGap: portrait ? 10 : 12,
    sectionsGridTemplateColumns: portrait ? "1fr" : "repeat(3, minmax(0, 1fr))",
    sectionLabelFontSize: portrait ? 26 : 24,
    shellHeight,
    shellWidth,
    statusFontSize: portrait ? 21 : 23,
    titleFontSize: portrait ? 40 : 46,
  };
}

function toneAccent(
  tone: DashboardRow["tone"],
  props: DashboardTriageProps
): string {
  if (tone === "attention") {
    return props.theme.attention;
  }
  if (tone === "complete") {
    return props.theme.complete;
  }
  return props.theme.working;
}

function enterProgress(frame: number, startFrame: number, duration: number) {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    easing: UI_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function SectionPanel({
  layout,
  props,
  section,
  sectionIndex,
}: {
  layout: DashboardTriageLayout;
  props: DashboardTriageProps;
  section: DashboardSection;
  sectionIndex: number;
}) {
  const frame = useCurrentFrame();
  const appear = enterProgress(frame, 14 + sectionIndex * 7, 24);
  const y = interpolate(appear, [0, 1], [18, 0]);
  const opacity = interpolate(appear, [0, 1], [0, 1]);

  return (
    <div
      style={{
        background: props.theme.panel,
        border: `2px solid ${toneAccent(section.tone, props)}`,
        borderRadius: 18,
        boxShadow: "0 28px 70px oklch(0.2 0.018 245 / 0.26)",
        opacity,
        padding: layout.panelPadding,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          alignItems: "center",
          color: props.theme.text,
          display: "flex",
          fontSize: layout.sectionLabelFontSize,
          fontWeight: 760,
          justifyContent: "space-between",
          marginBottom: layout.portrait ? 14 : 18,
        }}
      >
        <span>{section.label}</span>
        <span
          style={{
            color: toneAccent(section.tone, props),
            fontSize: layout.sectionCountFontSize,
            fontWeight: 700,
          }}
        >
          {section.rows.length}
        </span>
      </div>

      <div style={{ display: "grid", gap: layout.sectionGap }}>
        {section.rows.map((row) => (
          <div
            key={`${section.label}-${row.name}`}
            style={{
              alignItems: "center",
              background: "oklch(0.98 0.006 235 / 0.68)",
              borderRadius: 12,
              display: "grid",
              gap: layout.portrait ? "2px 12px" : 14,
              gridTemplateColumns: layout.rowGridTemplateColumns,
              minHeight: layout.rowMinHeight,
              padding: layout.portrait ? "8px 14px" : "0 16px",
            }}
          >
            <span
              style={{
                color: toneAccent(row.tone, props),
                fontSize: layout.portrait ? 26 : 30,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              *
            </span>
            <span
              style={{
                color: props.theme.text,
                fontFamily: MONO_FONT,
                fontSize: layout.rowNameFontSize,
                fontWeight: 760,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.name}
            </span>
            {layout.detailBelow ? null : (
              <span
                style={{
                  color: props.theme.muted,
                  fontSize: layout.rowDetailFontSize,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.detail}
              </span>
            )}
            <span
              style={{
                color: props.theme.muted,
                fontFamily: MONO_FONT,
                fontSize: layout.portrait ? 18 : 20,
                textAlign: "right",
              }}
            >
              {row.elapsed}
            </span>
            {layout.detailBelow ? (
              <span
                style={{
                  color: props.theme.muted,
                  fontSize: layout.rowDetailFontSize,
                  gridColumn: "2 / 4",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.detail}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export const DashboardTriageOverlay: React.FC<DashboardTriageProps> = (
  props
) => {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const layout = getDashboardTriageLayout(width, height);
  const entrance = enterProgress(frame, 0, 28);
  const scale = interpolate(entrance, [0, 1], [0.965, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background:
          "radial-gradient(circle at 16% 12%, oklch(0.82 0.045 205), transparent 32%), linear-gradient(135deg, oklch(0.91 0.018 240), oklch(0.79 0.018 258))",
        color: props.theme.text,
        display: "flex",
        fontFamily: SYSTEM_FONT,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: props.theme.surface,
          border: "1px solid oklch(0.72 0.014 245)",
          borderRadius: layout.portrait ? 28 : 30,
          boxShadow: "0 42px 140px oklch(0.24 0.025 250 / 0.34)",
          display: "grid",
          gridTemplateRows: `${layout.headerHeight}px 1fr ${layout.portrait ? 74 : 60}px`,
          height: layout.shellHeight,
          opacity,
          overflow: "hidden",
          transform: `scale(${scale})`,
          width: layout.shellWidth,
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "oklch(0.88 0.011 240)",
            borderBottom: "1px solid oklch(0.73 0.012 242)",
            display: "flex",
            gap: 12,
            height: layout.headerHeight,
            padding: layout.portrait ? "0 22px" : "0 26px",
          }}
        >
          <span
            style={{
              background: "oklch(0.67 0.19 27)",
              borderRadius: 999,
              height: 16,
              width: 16,
            }}
          />
          <span
            style={{
              background: "oklch(0.78 0.15 86)",
              borderRadius: 999,
              height: 16,
              width: 16,
            }}
          />
          <span
            style={{
              background: "oklch(0.71 0.16 150)",
              borderRadius: 999,
              height: 16,
              width: 16,
            }}
          />
          <span
            style={{
              color: props.theme.muted,
              flex: 1,
              fontSize: layout.portrait ? 18 : 20,
              fontWeight: 650,
              overflow: "hidden",
              textAlign: "center",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {props.title}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr",
            minHeight: 0,
            padding: layout.bodyPadding,
          }}
        >
          <div
            style={{
              alignItems: layout.portrait ? "start" : "end",
              display: "flex",
              flexDirection: layout.portrait ? "column" : "row",
              gap: layout.portrait ? 14 : 20,
              justifyContent: "space-between",
              marginBottom: layout.portrait ? 20 : 24,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: props.theme.text,
                  fontSize: layout.titleFontSize,
                  fontWeight: 820,
                  letterSpacing: 0,
                  lineHeight: 1,
                }}
              >
                Agents View
              </div>
              <div
                style={{
                  color: props.theme.muted,
                  fontSize: layout.statusFontSize,
                  fontWeight: 620,
                  marginTop: 10,
                }}
              >
                {props.statusLine}
              </div>
            </div>
            <div
              style={{
                background: "oklch(0.95 0.012 232)",
                border: "1px solid oklch(0.78 0.018 232)",
                borderRadius: 999,
                color: props.theme.muted,
                fontSize: layout.metricFontSize,
                fontWeight: 680,
                padding: "10px 18px",
              }}
            >
              workspace dashboard
            </div>
          </div>

          <div
            style={{
              alignContent: "start",
              display: "grid",
              gap: layout.panelGap,
              gridTemplateColumns: layout.sectionsGridTemplateColumns,
              minHeight: 0,
            }}
          >
            {props.sections.map((section, index) => (
              <SectionPanel
                key={section.label}
                layout={layout}
                props={props}
                section={section}
                sectionIndex={index}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            background: "oklch(0.9 0.01 240)",
            borderTop: "1px solid oklch(0.73 0.012 242)",
            color: props.theme.muted,
            display: "flex",
            flexWrap: layout.portrait ? "wrap" : "nowrap",
            fontFamily: MONO_FONT,
            fontSize: layout.footerFontSize,
            gap: layout.portrait ? "8px 20px" : 26,
            justifyContent: layout.portrait ? "center" : "flex-start",
            padding: layout.portrait ? "12px 28px" : "0 38px",
          }}
        >
          {props.footerHints.map((hint) => (
            <span key={hint}>{hint}</span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
