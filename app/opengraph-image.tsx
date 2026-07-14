import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Minerva Flow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F1E6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#167F5B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: "6px solid #F5F1E6",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 600, color: "#1A1E16" }}>
            Minerva&nbsp;<span style={{ color: "#0E5A40" }}>Flow</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#565F52" }}>
          Le cockpit de revenus pour restaurants et cafés
        </div>
      </div>
    ),
    { ...size }
  );
}
