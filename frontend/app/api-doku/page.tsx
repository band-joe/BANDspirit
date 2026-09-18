'use client';

/**
 * BANDspirit – API Dokumentation (Swagger UI)
 *
 * Diese Seite ist ohne Authentifizierung erreichbar (nicht in der Middleware-
 * Matcher-Liste, kein Dashboard-Layout mit Session-Prüfung). Sie dient als
 * Deeplink-Einstieg in die OpenAPI/Swagger-Dokumentation.
 *
 * Die Swagger UI wird aus dem CDN (unpkg.com) geladen und zeigt das OpenAPI-
 * Dokument des Backends an, das unter /api/swagger/v1/swagger.json bereitgestellt
 * wird. Nginx leitet /api/* an das Backend (api:8080) weiter; es ist keine
 * separate Konfiguration erforderlich.
 *
 * Try-It-Out: JWT-Token via POST /api/auth/login holen und im
 * Authorize-Dialog (🔒) als "Bearer <token>" eintragen.
 */

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function ApiDokuPage() {
  const [ready, setReady] = useState(false);

  function initSwaggerUI() {
    const SwaggerUIBundle = (window as any).SwaggerUIBundle;
    if (!SwaggerUIBundle) return;

    SwaggerUIBundle({
      url: '/api/swagger/v1/swagger.json',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset,
      ],
      plugins: [SwaggerUIBundle.plugins.DownloadUrl],
      layout: 'BaseLayout',
      deepLinking: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      filter: true,
      persistAuthorization: true,
      requestInterceptor: (req: any) => req,
    });

    setReady(true);
  }

  return (
    <>
      {/* Swagger UI Styles (CDN) */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        type="text/css"
        href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css"
      />

      {/* Swagger UI Bundle (CDN) */}
      <Script
        src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={initSwaggerUI}
      />

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header
          style={{
            background: '#3e8f88',
            color: 'white',
            padding: '0 24px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Logo / Home-Link */}
          <a
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '17px',
              letterSpacing: '-0.3px',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800,
              }}
            >
              BA
            </div>
            BANDspirit
          </a>

          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '18px' }}>›</span>

          <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
            API Dokumentation
          </span>

          <div style={{ flex: 1 }} />

          {/* Info-Badge */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '999px',
              padding: '3px 10px',
              letterSpacing: '0.3px',
            }}
          >
            OpenAPI v3 · REST + OData
          </span>
        </header>

        {/* ── Hinweis-Banner ───────────────────────────────────────────────── */}
        <div
          style={{
            background: '#fffbeb',
            borderBottom: '1px solid #fcd34d',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: '#92400e',
          }}
        >
          <span>🔒</span>
          <span>
            <strong>Try It Out:</strong> JWT-Token via{' '}
            <code
              style={{
                background: 'rgba(0,0,0,0.06)',
                borderRadius: '4px',
                padding: '1px 5px',
                fontFamily: 'monospace',
              }}
            >
              POST /api/auth/login
            </code>{' '}
            holen und im Authorize-Dialog (Schloss-Symbol) als{' '}
            <code
              style={{
                background: 'rgba(0,0,0,0.06)',
                borderRadius: '4px',
                padding: '1px 5px',
                fontFamily: 'monospace',
              }}
            >
              Bearer {'<token>'}
            </code>{' '}
            eintragen. Die Dokumentation selbst ist ohne Anmeldung zugänglich.
          </span>
        </div>

        {/* ── Swagger UI Container ──────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative' }}>
          {!ready && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                color: '#6b7280',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e5e7eb',
                  borderTop: '3px solid #3e8f88',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span style={{ fontSize: '14px' }}>API-Dokumentation wird geladen …</span>
            </div>
          )}
          <div id="swagger-ui" />
        </div>
      </div>

      {/* Spin-Animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Swagger UI: Header ausblenden (wir haben unseren eigenen) */
        .swagger-ui .topbar { display: none !important; }
        /* Etwas mehr Padding oben */
        .swagger-ui .wrapper { padding-top: 16px; }
        /* Try-It-Out-Button Farbe passend zu BANDspirit */
        .swagger-ui .btn.try-out__btn { background: #3e8f88 !important; border-color: #3e8f88 !important; }
        .swagger-ui .btn.execute { background: #3e8f88 !important; border-color: #3e8f88 !important; }
        .swagger-ui .btn.cancel { border-color: #3e8f88 !important; color: #3e8f88 !important; }
        .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #3e8f88 !important; }
        .swagger-ui .authorize svg { fill: #3e8f88 !important; }
        .swagger-ui .btn.authorize { color: #3e8f88 !important; border-color: #3e8f88 !important; }
      `}</style>
    </>
  );
}
