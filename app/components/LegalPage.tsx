import type { ReactNode } from "react";

/**
 * Yasal sayfaların ortak iskeleti.
 *
 * Bu sayfalar Shopify oturumu GEREKTİRMEZ — App Store başvurusunda ve
 * uygulama listelemesinde herkese açık URL olarak verilir. Polaris
 * kullanılmaz; yönetici paneli dışında yüklenmesi gereksiz ağırlık olur.
 */

/** ⚠️ Yayına almadan önce doldurun. */
export const COMPANY = {
  name: "Ganz Dijital",
  appName: "ScratchCart",
  email: "destek@ganzz.digital",
  address: "İzmir, Türkiye",
  updated: "16 Ağustos 2026",
};

const INK = "#0b0a12";
const SURFACE = "#141126";
const GOLD = "#e8c88a";
const TEXT = "#f6f1e6";
const DIM = "rgba(246,241,230,.62)";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(80% 50% at 50% 0%, rgba(232,200,138,.1), transparent 60%), ${INK}`,
        color: TEXT,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        lineHeight: 1.65,
        padding: "56px 20px 96px",
      }}
    >
      <main style={{ maxWidth: 760, margin: "0 auto" }}>
        <a
          href="/"
          style={{
            display: "inline-block",
            marginBottom: 28,
            color: GOLD,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: ".22em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          {COMPANY.appName}
        </a>

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: 34,
            fontWeight: 640,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p style={{ margin: "0 0 8px", color: DIM, fontSize: 15 }}>{intro}</p>
        <p style={{ margin: 0, color: "rgba(246,241,230,.34)", fontSize: 13 }}>
          Son güncelleme: {COMPANY.updated}
        </p>

        <div
          style={{
            marginTop: 36,
            padding: "30px 28px",
            background: SURFACE,
            border: "1px solid rgba(232,200,138,.22)",
            borderRadius: 18,
          }}
        >
          {children}
        </div>

        <footer
          style={{
            marginTop: 30,
            paddingTop: 20,
            borderTop: "1px solid rgba(246,241,230,.1)",
            color: "rgba(246,241,230,.34)",
            fontSize: 13,
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <a href="/privacy" style={{ color: DIM, textDecoration: "none" }}>
            Gizlilik Politikası
          </a>
          <a href="/terms" style={{ color: DIM, textDecoration: "none" }}>
            Hizmet Şartları
          </a>
          <a
            href={`mailto:${COMPANY.email}`}
            style={{ color: DIM, textDecoration: "none" }}
          >
            {COMPANY.email}
          </a>
        </footer>
      </main>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        margin: "30px 0 10px",
        fontSize: 18,
        fontWeight: 640,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 12px", fontSize: 15, color: DIM }}>{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 15, color: DIM }}>
      {children}
    </ul>
  );
}

export function Divider() {
  return (
    <hr
      style={{
        margin: "38px 0 4px",
        border: 0,
        borderTop: "1px solid rgba(246,241,230,.12)",
      }}
    />
  );
}
