import { useEffect, useRef } from "react";

/* Vitrindeki widget ile aynı sabitler (scratchcart.css içindeki tokenlar).
   Bunlar tema ayarından bağımsızdır; kart yüzeyi hangi renk olursa olsun
   metin okunur kalmalıdır. */
const ON_SURFACE = "#f6f1e6";
const ON_SURFACE_DIM = "rgba(246,241,230,.58)";
const ON_SURFACE_FAINT = "rgba(246,241,230,.3)";
const DISPLAY =
  'ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif';
const BODY =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
const MONO = 'ui-monospace, "SF Mono", "Roboto Mono", Menlo, monospace';

export type PreviewSettings = {
  title: string;
  subtitle: string;
  scratchText: string;
  backgroundColor: string;
  cardColor: string;
  revealColor: string;
  textColor: string;
};

/**
 * Panelde gösterilen bilet, mağaza vitrinindeki bileti birebir taklit eder;
 * satıcı kaydetmeden önce sonucu görür. Kazıma burada da çalışır.
 */
export function TicketPreview({ settings }: { settings: PreviewSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, rect.height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, shade(settings.cardColor, -22));
    gradient.addColorStop(0.34, shade(settings.cardColor, 30));
    gradient.addColorStop(0.5, shade(settings.cardColor, -6));
    gradient.addColorStop(0.74, shade(settings.cardColor, 24));
    gradient.addColorStop(1, shade(settings.cardColor, -26));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.globalAlpha = 0.06;
    for (let i = 0; i < Math.round(rect.width * rect.height * 0.04); i++) {
      ctx.fillStyle = i % 2 ? "#ffffff" : "#000000";
      ctx.fillRect(Math.random() * rect.width, Math.random() * rect.height, 1, 1);
    }
    ctx.globalAlpha = 1;

    let drawing = false;
    let last: { x: number; y: number } | null = null;

    const point = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };

    const carve = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    };

    const down = (event: PointerEvent) => {
      drawing = true;
      last = point(event);
      carve(last, last);
    };
    const move = (event: PointerEvent) => {
      if (!drawing) return;
      const next = point(event);
      carve(last ?? next, next);
      last = next;
    };
    const up = () => {
      drawing = false;
      last = null;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [settings.cardColor, settings.scratchText]);

  return (
    <div
      style={{
        // Perde: vitrindeki ile aynı iki halo + obsidyen zemin
        background: `radial-gradient(80% 55% at 50% 8%, ${hexAlpha(
          settings.revealColor,
          0.13,
        )}, transparent 62%), radial-gradient(90% 60% at 50% 100%, rgba(120,92,190,.14), transparent 60%), ${settings.backgroundColor}`,
        padding: "26px 18px",
        borderRadius: 10,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 320,
          // Kart yüzeyi: üstte ince ışık, altta koyu — vitrindeki cam etkisi
          background: `linear-gradient(180deg, rgba(255,255,255,.07), transparent 26%), linear-gradient(165deg, ${shade(
            settings.textColor,
            14,
          )}, ${settings.textColor} 62%)`,
          color: ON_SURFACE,
          border: `1px solid ${hexAlpha(settings.revealColor, 0.26)}`,
          borderRadius: 20,
          padding: "24px 20px 16px",
          boxShadow: `0 30px 64px -24px rgba(0,0,0,.85), 0 0 54px -14px ${hexAlpha(
            settings.revealColor,
            0.16,
          )}`,
          fontFamily: BODY,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span
            style={{
              display: "inline-block",
              border: `1px solid ${hexAlpha(settings.revealColor, 0.26)}`,
              color: settings.revealColor,
              borderRadius: 999,
              padding: "5px 12px 4px",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: ".24em",
              textIndent: ".24em",
              textTransform: "uppercase",
            }}
          >
            Tek kullanımlık bilet
          </span>
          <h3
            style={{
              margin: "12px 0 5px",
              fontSize: 20,
              fontWeight: 620,
              lineHeight: 1.18,
              letterSpacing: "-0.015em",
              color: ON_SURFACE,
            }}
          >
            {settings.title || "Başlık"}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.5,
              color: ON_SURFACE_DIM,
            }}
          >
            {settings.subtitle}
          </p>
        </div>

        <div
          ref={wrapRef}
          style={{
            position: "relative",
            aspectRatio: "16 / 10",
            borderRadius: 14,
            overflow: "hidden",
            background: "#0e0c1a",
            boxShadow: `0 0 0 1px ${hexAlpha(settings.revealColor, 0.26)} inset`,
            touchAction: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              gap: 5,
              background: `radial-gradient(70% 70% at 50% 45%, ${hexAlpha(
                settings.revealColor,
                0.1,
              )}, transparent 70%)`,
            }}
          >
            {/* Ödül: vitrindeki gibi serif ve altın gradyan */}
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: 30,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                lineHeight: 1.05,
                backgroundImage: `linear-gradient(100deg, ${shade(
                  settings.cardColor,
                  -30,
                )}, ${settings.revealColor} 32%, #fff6e0 48%, ${
                  settings.revealColor
                } 64%, ${shade(settings.cardColor, -30)})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              %20 İNDİRİM
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: ".16em",
                textIndent: ".16em",
                textTransform: "uppercase",
                color: ON_SURFACE_FAINT,
              }}
            >
              Sepetinize işlenecek
            </span>
          </div>
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              cursor: "grab",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
              width: "82%",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: ".2em",
              textIndent: ".2em",
              color: "rgba(20,16,34,.62)",
              textShadow: "0 1px 0 rgba(255,255,255,.35)",
              textTransform: "uppercase",
            }}
          >
            {settings.scratchText || "KAZI"}
          </span>
        </div>

        {/* Ana eylem: altın gradyan buton */}
        <div
          style={{
            marginTop: 16,
            padding: "13px 16px",
            borderRadius: 12,
            textAlign: "center",
            background: `linear-gradient(180deg, ${shade(
              settings.revealColor,
              22,
            )}, ${settings.revealColor} 55%, ${shade(settings.revealColor, -26)})`,
            color: "#17122a",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            boxShadow: `0 1px 0 rgba(255,255,255,.5) inset, 0 12px 24px -14px ${hexAlpha(
              settings.revealColor,
              0.85,
            )}`,
          }}
        >
          Hediyemi al
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${hexAlpha("#f6f1e6", 0.1)}`,
            fontSize: 9,
            color: ON_SURFACE_FAINT,
          }}
        >
          <span style={{ fontFamily: MONO, letterSpacing: ".1em" }}>
            NO 4KP2M8QX7T1B
          </span>
          <span style={{ textAlign: "right", maxWidth: "62%", lineHeight: 1.5 }}>
            Tek kullanımlık. Diğer kampanyalarla birleşmeyebilir.
          </span>
        </div>
      </div>
    </div>
  );
}

function shade(hex: string, amount: number) {
  let value = hex.replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(value, 16);
  if (Number.isNaN(num)) return hex;
  const parts = [num >> 16, (num >> 8) & 255, num & 255].map((channel) =>
    Math.max(0, Math.min(255, channel + amount)),
  );
  return `#${parts.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function hexAlpha(hex: string, alpha: number) {
  let value = hex.replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(value, 16);
  if (Number.isNaN(num)) return hex;
  return `rgba(${num >> 16}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}
