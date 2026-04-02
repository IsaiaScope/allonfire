import { ImageResponse } from "next/og";

export const alt = "Isaia & Laura — Photos & Games";
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
        backgroundColor: "#37302a",
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
        <span style={{ color: "#c28232" }}>L</span>
        <span style={{ color: "#e8d5b5" }}>A</span>
        <span style={{ color: "#c28232" }}>U</span>
        <span style={{ color: "#e8d5b5" }}>R</span>
        <span style={{ color: "#c28232" }}>A</span>
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
            background: "linear-gradient(90deg, #8B5E3C, #c28232)",
            fontSize: 24,
            letterSpacing: 3,
            fontWeight: 400,
          }}
        >
          ISAIA & LAURA'S PHOTOS & GAMES
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: "#a89580",
          marginTop: 32,
        }}
      >
        Our private space for photos and games
      </div>
    </div>,
    { ...size }
  );
}
