import { ImageResponse } from "next/og";

export const alt = "Social — Content Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#151515",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 120,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginBottom: 16,
        }}
      >
        <span style={{ color: "#C0C0C0" }}>A</span>
        <span style={{ color: "#FF8811" }}>O</span>
        <span style={{ color: "#C0C0C0" }}>F</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            padding: "8px 24px",
            borderRadius: 12,
            background: "linear-gradient(90deg, #8B1A6B, #C435A8)",
            fontSize: 28,
            letterSpacing: 4,
            fontWeight: 400,
          }}
        >
          SOCIAL
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 24,
          color: "#888",
          marginTop: 32,
        }}
      >
        Social Content Dashboard
      </div>
    </div>,
    { ...size }
  );
}
