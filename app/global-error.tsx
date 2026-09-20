"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { reportClientError } from "@/lib/alerts/client-reporter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 1. Télémétrie Sentry
    Sentry.captureException(error);
    // 2. Alerte critique par courriel via notre service d'alerting
    reportClientError(error, "global_error_boundary");
  }, [error]);

  return (
    <html lang="fr">
      <head>
        <title>Incident temporaire — Minerva Flow</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: "32px 16px",
          minHeight: "100vh",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f1e6",
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#1a1e16",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            backgroundColor: "#fffefa",
            border: "1px solid #e6e0d0",
            borderRadius: "24px",
            padding: "40px 32px",
            boxShadow: "0 12px 36px rgba(26, 30, 22, 0.06)",
            textAlign: "center",
          }}
        >
          {/* Logo & Badge */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto 16px",
                borderRadius: "16px",
                backgroundColor: "#167f5b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "26px",
                fontWeight: 700,
                boxShadow: "0 6px 18px rgba(22, 127, 91, 0.25)",
              }}
            >
              F
            </div>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                backgroundColor: "#dcece3",
                color: "#0e5a40",
                fontSize: "12px",
                fontWeight: 700,
                borderRadius: "999px",
                letterSpacing: "0.02em",
              }}
            >
              Minerva Flow
            </span>
          </div>

          {/* Titre Serif Éditorial */}
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 700,
              lineHeight: 1.3,
              margin: "0 0 12px",
              color: "#1a1e16",
            }}
          >
            Un incident inattendu est survenu
          </h1>

          {/* Message rassurant */}
          <p
            style={{
              fontSize: "14.5px",
              lineHeight: 1.6,
              color: "#565f52",
              margin: "0 0 28px",
            }}
          >
            Vos données d&apos;établissement et vos accès restent protégés. Notre équipe d&apos;ingénierie a été prévenue
            automatiquement de cet incident.
          </p>

          {/* Boutons d'action */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "stretch",
            }}
          >
            <button
              onClick={() => {
                if (typeof reset === "function") {
                  reset();
                } else {
                  window.location.reload();
                }
              }}
              style={{
                padding: "13px 24px",
                backgroundColor: "#167f5b",
                color: "#ffffff",
                border: "none",
                borderRadius: "999px",
                fontSize: "14.5px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(22, 127, 91, 0.20)",
                transition: "background-color 0.15s ease",
              }}
            >
              Réessayer et recharger l&apos;application
            </button>

            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "12px 24px",
                backgroundColor: "transparent",
                color: "#565f52",
                border: "1px solid #e6e0d0",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retourner à l&apos;accueil
            </button>
          </div>

          {/* Footer de conformité */}
          <div
            style={{
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: "1px solid #eee9db",
              fontSize: "11.5px",
              color: "#8d9488",
            }}
          >
            © 2026 Minerva Flow · Minerva Technologies Inc.
          </div>
        </div>
      </body>
    </html>
  );
}
