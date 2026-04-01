import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Laura — Family Photos & Games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#151515",
        fontFamily: "sans-serif",
      }}
    >
      {/* Flame icon */}
      <svg
        aria-label="AllOnFire flame icon"
        fill="none"
        height="80"
        role="img"
        viewBox="0 0 24 24"
        width="80"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fg" x1="0.5" x2="0.5" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFDD44" />
            <stop offset="50%" stopColor="#FF8811" />
            <stop offset="100%" stopColor="#E03C00" />
          </linearGradient>
        </defs>
        <path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          fill="url(#fg)"
        />
      </svg>

      {/* App name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: 24,
        }}
      >
        <div
          style={{
            background: "linear-gradient(90deg, #0D7C4A, #10A760, #2DD47B)",
            borderRadius: 16,
            padding: "12px 48px",
            fontSize: 48,
            fontWeight: 600,
            color: "white",
            letterSpacing: 6,
          }}
        >
          LAURA
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          color: "#C0C0C0",
          fontSize: 28,
          marginTop: 28,
          letterSpacing: 1,
        }}
      >
        Family Photos & Games
      </div>

      {/* Feature pills */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 32,
        }}
      >
        {["Photo Gallery", "Memory Game", "Quiz", "Leaderboards"].map(
          (feature) => (
            <div
              key={feature}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 24,
                padding: "8px 20px",
                color: "#A0A0A0",
                fontSize: 18,
              }}
            >
              {feature}
            </div>
          )
        )}
      </div>
    </div>,
    { ...size }
  );
}
