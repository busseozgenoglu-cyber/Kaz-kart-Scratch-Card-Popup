import { useId } from "react";

type SeriesPoint = { date: string; displays: number; conversions: number; revenue: number };

/**
 * Gösterim ve kurtarma eğrisi.
 * Harici grafik kütüphanesi yerine SVG: paket boyutu küçük kalır ve
 * gömülü panel 3 saniyenin altında açılır.
 */
export function TrendChart({
  series,
  height = 200,
}: {
  series: SeriesPoint[];
  height?: number;
}) {
  const gradientId = useId();
  const width = 720;
  const padding = { top: 12, right: 8, bottom: 22, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (series.length < 2) {
    return (
      <div
        style={{
          height,
          display: "grid",
          placeItems: "center",
          color: "#6b7177",
          fontSize: 13,
        }}
      >
        Grafik için en az iki günlük veri gerekiyor.
      </div>
    );
  }

  const max = Math.max(1, ...series.map((point) => point.displays));
  const x = (index: number) => padding.left + (index / (series.length - 1)) * innerW;
  const y = (value: number) => padding.top + innerH - (value / max) * innerH;

  const line = (key: "displays" | "conversions") =>
    series
      .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point[key])}`)
      .join(" ");

  const area = `${line("displays")} L${x(series.length - 1)},${padding.top + innerH} L${x(0)},${
    padding.top + innerH
  } Z`;

  const ticks = [0, Math.floor(series.length / 2), series.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height }}
      role="img"
      aria-label="Günlük gösterim ve kurtarma eğrisi"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d22b3f" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#d22b3f" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + innerH * ratio}
          y2={padding.top + innerH * ratio}
          stroke="#e3e3e3"
          strokeWidth="1"
        />
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line("displays")} fill="none" stroke="#d22b3f" strokeWidth="2" />
      <path
        d={line("conversions")}
        fill="none"
        stroke="#1fb980"
        strokeWidth="2"
        strokeDasharray="4 3"
      />

      {ticks.map((index) => (
        <text
          key={index}
          x={x(index)}
          y={height - 6}
          textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}
          fontSize="11"
          fill="#6b7177"
        >
          {formatDay(series[index].date)}
        </text>
      ))}
    </svg>
  );
}

function formatDay(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}.${month}`;
}

/** Ödül dağılımı — yatay bar, pasta grafikten okunması daha kolay. */
export function TierBars({
  data,
}: {
  data: Array<{ tier: string; label: string; count: number }>;
}) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const colors: Record<string, string> = {
    free_shipping: "#1fb980",
    "10_percent": "#f2b23e",
    "15_percent": "#e07b39",
    "20_percent": "#d22b3f",
  };

  if (!total) {
    return (
      <p style={{ color: "#6b7177", fontSize: 13, margin: 0 }}>
        Henüz ödül dağıtılmadı.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {data.map((row) => {
        const percent = (row.count / total) * 100;
        return (
          <div key={row.tier}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginBottom: 5,
              }}
            >
              <span>{row.label}</span>
              <span style={{ color: "#6b7177", fontVariantNumeric: "tabular-nums" }}>
                {row.count} · %{percent.toFixed(0)}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "#f1f1f1",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: "100%",
                  background: colors[row.tier] ?? "#8c9196",
                  transition: "width .3s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
