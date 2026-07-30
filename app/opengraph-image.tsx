import { ImageResponse } from "next/og";

// Node runtime - next/og on Edge exceeds Vercel Hobby's 1 MB limit.
export const alt = "harbi.eu - Arthur Reichard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf6f0",
          padding: "72px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: "0.04em",
            color: "#9a4e2c",
          }}
        >
          harbi.eu
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              lineHeight: 1.05,
              color: "#1c1916",
              fontWeight: 500,
              maxWidth: 900,
            }}
          >
            Arthur Reichard
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              lineHeight: 1.4,
              color: "#5c534a",
              maxWidth: 820,
            }}
          >
            Software from schema to screen - with a private workspace on the side.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 6,
            width: 120,
            background: "#9a4e2c",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
