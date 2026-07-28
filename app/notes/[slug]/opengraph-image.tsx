import { ImageResponse } from "next/og";
import { getNote } from "@/backend/notes";

export const alt = "Note · harbi.eu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function NoteOpenGraphImage({ params }: Props) {
  const { slug } = await params;
  const note = await getNote(slug);
  const title = note?.title ?? "Note";
  const excerpt = note?.excerpt ?? "harbi.eu";

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
        <div style={{ display: "flex", fontSize: 24, color: "#9a4e2c" }}>
          harbi.eu / notes
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              lineHeight: 1.1,
              color: "#1c1916",
              fontWeight: 500,
              maxWidth: 960,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              lineHeight: 1.4,
              color: "#5c534a",
              maxWidth: 900,
            }}
          >
            {excerpt}
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
